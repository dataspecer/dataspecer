import { LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import { changesToSemanticModelOperations } from "@dataspecer/core-v2/semantic-model/operations";
import type { CoreOperationAndOperation, CoreResourceAndEntity } from "@dataspecer/core/core";
import { applyOperationsToStructureModel } from "@dataspecer/core/data-psm";
import { changesToEntityOperations, diffEntities, type Entity, type EntityChange, type EntityRecord } from "@dataspecer/core/entity-model";
import {
  isRemoveEntityOperation,
  isSetEntityOperation,
  isUndoOperation,
  isUpdateEntityOperation,
  resolveCancelledTransactions,
  type Operation,
  type OperationInModel,
  type Transaction,
  type UndoOperation,
} from "@dataspecer/core/operation";
import {
  applyOperationsToAsyncQueryableModel,
  ReloadModelOperationType,
  SetModelUrlsOperationType,
  type SetModelUrl,
} from "@dataspecer/model-store/implementation";
import { SemanticProfileModelOperations } from "@dataspecer/profile-model";
import { applyOperationsToVisualModel } from "@dataspecer/visual-model/executor";

/**
 * Model types whose model is stored as one blob entity rather than a set of
 * individually addressed entities. For blob models only the down events of a
 * transaction are recorded - the up state is available as the next
 * transaction's down event, or as the current snapshot.
 */
export function isBlobModelType(modelType: string): boolean {
  return (
    modelType !== LOCAL_SEMANTIC_MODEL &&
    modelType !== VISUAL_MODEL &&
    modelType !== V1.PSM &&
    modelType !== QUERYABLE_MODEL &&
    modelType !== RDFS_MODEL
  );
}

/**
 * Converts entity changes of one model to its up/down transaction events: the
 * state of each changed entity after the change (up, null = removed) and
 * before the change (down, null = did not exist yet), keyed by entity id.
 */
export function entityChangesToEvents(changes: EntityChange[]): { up: Record<string, Entity | null>; down: Record<string, Entity | null> } {
  const up: Record<string, Entity | null> = {};
  const down: Record<string, Entity | null> = {};
  for (const change of changes) {
    const id = (change.next ?? change.previous)!.id;
    up[id] = change.next;
    down[id] = change.previous;
  }
  return { up, down };
}

/**
 * Diffs two states of a model of the given type and returns operations that
 * would transform the previous state into the next one, tagged with the id of
 * the model they belong to.
 */
export function diffModelEntitiesToOperations(modelId: string, modelType: string, previous: EntityRecord, next: EntityRecord): OperationInModel[] {
  let remainingChanges = diffEntities(previous, next);
  const operations: Operation[] = [];

  if (modelType === LOCAL_SEMANTIC_MODEL) {
    const semantic = changesToSemanticModelOperations(remainingChanges);
    operations.push(...semantic.operations);

    const profile = SemanticProfileModelOperations.changesToProfileModelOperations(semantic.remainingChanges);
    operations.push(...profile.operations);

    remainingChanges = profile.remainingChanges;
  }

  // todo: Implement differ for other models

  operations.push(...changesToEntityOperations(remainingChanges));

  return operations.map((operation) => ({ modelId, operation }));
}

/**
 * Diffs two snapshots of model states (model id to entities) and converts the
 * differences into operations, tagged with the id of the model they belong
 * to. Semantic operations are generated where possible; everything else falls
 * back to the generic set/update/remove entity operations.
 */
export function diffModelStatesToOperations(previous: Record<string, EntityRecord>, next: Record<string, EntityRecord>): OperationInModel[] {
  const modelIds = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const operations: OperationInModel[] = [];

  for (const modelId of modelIds) {
    const changes = diffEntities(previous[modelId] ?? {}, next[modelId] ?? {});
    const { operations: semanticOps, remainingChanges } = changesToSemanticModelOperations(changes);
    for (const operation of semanticOps) {
      operations.push({ modelId, operation });
    }
    for (const operation of changesToEntityOperations(remainingChanges)) {
      operations.push({ modelId, operation });
    }
  }

  return operations;
}

/**
 * Applies operations to entities of a model of the given type and returns the
 * new state. The input entities are not modified.
 *
 * The generic set/update/remove entity operations are accepted by all model
 * types; other operations are dispatched to the executor of the given model
 * type. Operations that cannot be executed are ignored, as required by the
 * {@link Operation} contract.
 */
export function applyOperationsToModelEntities(modelId: string, modelType: string, entities: EntityRecord, operations: Operation[]): EntityRecord {
  const working = { ...entities };

  for (const operation of operations) {
    if (isSetEntityOperation(operation)) {
      working[operation.entity.id] = operation.entity;
    } else if (isUpdateEntityOperation(operation)) {
      const entity = working[operation.update.id];
      // If entity does not exist, do nothing
      if (entity) {
        working[operation.update.id] = { ...entity, ...operation.update };
      }
    } else if (isRemoveEntityOperation(operation)) {
      delete working[operation.entityId];
    } else {
      applyModelSpecificOperation(modelId, modelType, working, operation);
    }
  }

  return working;
}

/**
 * One transaction of the history, projected onto a single model, as needed to
 * interpret an undo operation in it. See
 * {@link applyUndoOperationToModelEntities}.
 */
export interface UndoHistoryEntry {
  /** Client-generated transaction id. */
  clientId: string;
  /** Operations of the transaction targeting the model, in order. */
  operations: Operation[];
  /**
   * Entity states before the transaction for the model, empty when the
   * transaction did not change the model. Null when the transaction's events
   * were not recorded at all.
   */
  downEvents: Record<string, Entity | null> | null;
}

/**
 * Interprets an undo operation for one model. The undo cancels the referenced
 * transaction as a whole - possibly spanning several models - but since every
 * operation is applied to a single model in isolation, it arrives dispatched
 * to each model the cancelled transaction touched; this function handles one
 * such model, cancelling the transaction's operations on it as if they never
 * happened.
 *
 * The final state is computed from the model's history (oldest first, up to
 * and including the transaction the current state reflects): the state is
 * rewound to before the earliest transaction ever targeted by an undo, by
 * patching the recorded down events in reverse order, and the operations of
 * the transactions from that point on are replayed, skipping transactions
 * that are effectively cancelled (see {@link resolveCancelledTransactions})
 * and undo operations themselves, whose effect the replay already accounts
 * for.
 *
 * Returns null when the undo cannot be interpreted - the referenced
 * transaction is not in the history, or a transaction that would have to be
 * rewound has no recorded events. The caller should then only record the
 * operation, per the {@link Operation} contract.
 *
 * The input entities are not modified.
 */
export function applyUndoOperationToModelEntities(
  modelId: string,
  modelType: string,
  entities: EntityRecord,
  undoOperation: UndoOperation,
  history: UndoHistoryEntry[],
): EntityRecord | null {
  // Pseudo transactions for the cancellation resolution. The undo operation
  // being applied participates as the last, not yet recorded transaction; as
  // client-generated ids are always uuids, "current" cannot collide with them.
  const pseudoTransactions: Transaction[] = history.map((entry) => ({
    id: entry.clientId,
    operations: entry.operations.map((operation) => ({ modelId, operation })),
  }));
  pseudoTransactions.push({ id: "current", operations: [{ modelId, operation: undoOperation }] });

  // Find the earliest transaction targeted by any undo operation: everything
  // before it is unaffected by any cancellation, so it is a safe point to
  // rewind to and replay from. Undo targets that are not part of the history
  // never had an effect and are skipped.
  const indexByClientId = new Map<string, number>();
  history.forEach((entry, index) => indexByClientId.set(entry.clientId, index));

  const targetIndex = indexByClientId.get(undoOperation.cancelTransactionId);
  if (targetIndex === undefined) {
    return null;
  }

  let earliestIndex = targetIndex;
  for (const transaction of pseudoTransactions) {
    for (const { operation } of transaction.operations) {
      if (isUndoOperation(operation)) {
        const index = indexByClientId.get(operation.cancelTransactionId);
        if (index !== undefined && index < earliestIndex) {
          earliestIndex = index;
        }
      }
    }
  }

  // Transactions that changed the model but have no recorded events cannot be
  // rewound through.
  for (let index = earliestIndex; index < history.length; index++) {
    if (history[index]!.downEvents === null && history[index]!.operations.length > 0) {
      return null;
    }
  }

  const cancelled = resolveCancelledTransactions(pseudoTransactions);
  const isCancelled = (index: number) => cancelled.get(pseudoTransactions[index]!.id)?.has(modelId) ?? false;

  // Rewind to the state before the earliest affected transaction.
  let working = { ...entities };
  for (let index = history.length - 1; index >= earliestIndex; index--) {
    for (const [entityId, entity] of Object.entries(history[index]!.downEvents ?? {})) {
      if (entity === null) {
        delete working[entityId];
      } else {
        working[entityId] = entity;
      }
    }
  }

  // Replay the effective operations on top of it.
  for (let index = earliestIndex; index < history.length; index++) {
    if (isCancelled(index)) {
      continue;
    }
    const operations = history[index]!.operations.filter((operation) => !isUndoOperation(operation));
    if (operations.length > 0) {
      working = applyOperationsToModelEntities(modelId, modelType, working, operations);
    }
  }

  return working;
}

/**
 * Applies a single model type specific operation to the mutable entity record.
 */
function applyModelSpecificOperation(modelId: string, modelType: string, working: EntityRecord, operation: Operation): void {
  if (modelType === LOCAL_SEMANTIC_MODEL) {
    applyOperationsToSemanticModel(working, [operation]);
    return;
  }

  if (modelType === VISUAL_MODEL) {
    applyOperationsToVisualModel(working, [operation]);
    return;
  }

  if (modelType === V1.PSM) {
    applyOperationsToStructureModel(working as EntityRecord<CoreResourceAndEntity>, [operation as CoreOperationAndOperation]);
    return;
  }

  if (modelType === QUERYABLE_MODEL) {
    applyOperationsToAsyncQueryableModel(working, [operation]);
    return;
  }

  if (modelType === RDFS_MODEL) {
    if (operation.type === SetModelUrlsOperationType) {
      // Only the urls are updated; the cached vocabulary entities are
      // refetched by the reload endpoint, not by applying operations.
      working[modelId] = { ...working[modelId], urls: (operation as SetModelUrl).urls } as EntityRecord[string];
      return;
    }
    if (operation.type === ReloadModelOperationType) {
      return;
    }
    applyOperationsToSemanticModel(working, [operation]);
    return;
  }

  console.warn(`Unsupported operation "${operation.type}" for model "${modelId}" of type "${modelType}". The operation is ignored.`);
}
