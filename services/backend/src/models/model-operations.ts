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
import type { ProjectModelEntity } from "@dataspecer/project-model";
import { PROJECT_MODEL_ID } from "./model-id.ts";
import { applyModelTypeOperation, modelTypeChangesToOperations } from "./model-types.ts";

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
 * the model they belong to. Changes the model type has no richer operations
 * for are expressed as generic entity operations.
 */
export function diffModelEntitiesToOperations(modelId: string, modelType: string, previous: EntityRecord, next: EntityRecord): OperationInModel[] {
  const changes = diffEntities(previous, next);
  const { operations, remainingChanges } = modelTypeChangesToOperations(modelType, changes);
  return [...operations, ...changesToEntityOperations(remainingChanges)].map((operation) => ({ modelId, operation }));
}

/**
 * Diffs two snapshots of model states (model id to entities) and converts the
 * differences into operations, tagged with the id of the model they belong to.
 * The type of each model is resolved from its project model entity so that the
 * diff can generate model type specific operations; models without one (the
 * virtual project model itself, named blob stores) fall back to the generic
 * entity operations.
 */
export function diffModelStates(previous: Record<string, EntityRecord>, next: Record<string, EntityRecord>): OperationInModel[] {
  const modelIds = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const operations: OperationInModel[] = [];

  for (const modelId of modelIds) {
    if (modelId === PROJECT_MODEL_ID) {
      continue;
    }

    const projectEntity = (next[PROJECT_MODEL_ID]?.[modelId] ?? previous[PROJECT_MODEL_ID]?.[modelId]) as ProjectModelEntity;
    const modelType = projectEntity.modelType;
    operations.push(...diffModelEntitiesToOperations(modelId, modelType, previous[modelId] ?? {}, next[modelId] ?? {}));
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
      applyModelTypeOperation(modelId, modelType, working, operation);
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
