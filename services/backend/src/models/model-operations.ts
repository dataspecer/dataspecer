import { changesToEntityOperations, diffEntities, type Entity, type EntityChange, type EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
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
  applyOperationsToVirtualProjectModel,
  isCreateModelOperation,
  isCreateProjectOperation,
  isRemoveModelOperation,
  type ProjectModelEntity,
} from "@dataspecer/core/project-model";
import { PROJECT_MODEL_ID, splitModelId } from "./model-id.ts";
import { applyModelTypeOperation, modelTypeChangesToOperations, NAMED_BLOB_STORE_TYPE } from "./model-types.ts";
import type { TransactionEvents } from "./transaction-model.ts";

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
    // The virtual project model itself (modelId === PROJECT_MODEL_ID) is
    // diffed too, so changes to a resource's label/description (e.g. a
    // package renamed on reload) are captured as generic update-entity
    // operations - it has no richer model-type-specific operations, so it
    // always falls back to NAMED_BLOB_STORE_TYPE below.
    const projectEntity = (next[PROJECT_MODEL_ID]?.[modelId] ?? previous[PROJECT_MODEL_ID]?.[modelId]) as ProjectModelEntity | undefined;
    const modelType = projectEntity?.modelType ?? NAMED_BLOB_STORE_TYPE;
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
 * type. The virtual project model has no stored type and is recognized by its
 * id instead. Operations that cannot be executed are ignored, as required by
 * the {@link Operation} contract.
 *
 * For the project model this only updates the projection of the project
 * structure; creating and removing the backing resources is the caller's
 * responsibility.
 */
export function applyOperationsToModelEntities(modelId: string, modelType: string, entities: EntityRecord, operations: Operation[]): EntityRecord {
  const working = { ...entities };

  for (const operation of operations) {
    if (isSetEntityOperation(operation)) {
      working[operation.entity.id] = operation.entity;
    } else if (isUpdateEntityOperation(operation)) {
      const entity = working[operation.entityId];
      // If entity does not exist, do nothing
      if (entity) {
        working[operation.entityId] = { ...entity, ...operation.update };
      }
    } else if (isRemoveEntityOperation(operation)) {
      delete working[operation.entityId];
    } else if (modelId === PROJECT_MODEL_ID) {
      applyOperationsToVirtualProjectModel(working as EntityRecord<ProjectModelEntity>, [operation]);
    } else {
      applyModelTypeOperation(modelId, modelType, working, operation);
    }
  }

  return working;
}

/**
 * Splits the operations of a transaction into the groups they are applied in:
 * the project model creates its models first, then every other model's
 * operations follow in the order the models appear, and the project model
 * removes its models last.
 *
 * Undo operations are returned separately, as they cancel a whole transaction
 * and are therefore interpreted against the history rather than against a
 * single model, see {@link applyUndoOperationToModels}.
 */
export function groupTransactionOperations(operations: OperationInModel[]): { undoOperations: UndoOperation[]; groups: [ModelIdentifier, Operation[]][] } {
  const undoOperations: UndoOperation[] = [];
  const creations: Operation[] = [];
  const removals: Operation[] = [];
  const operationsByModel = new Map<ModelIdentifier, Operation[]>();

  for (const { modelId, operation } of operations) {
    if (isUndoOperation(operation)) {
      undoOperations.push(operation);
      continue;
    }
    if (modelId === PROJECT_MODEL_ID) {
      if (isCreateProjectOperation(operation) || isCreateModelOperation(operation)) {
        creations.push(operation);
        continue;
      }
      if (isRemoveModelOperation(operation)) {
        removals.push(operation);
        continue;
      }
    }
    if (!operationsByModel.has(modelId)) {
      operationsByModel.set(modelId, []);
    }
    operationsByModel.get(modelId)!.push(operation);
  }

  const groups: [ModelIdentifier, Operation[]][] = [[PROJECT_MODEL_ID, creations], ...operationsByModel, [PROJECT_MODEL_ID, removals]];
  return { undoOperations, groups: groups.filter(([, group]) => group.length > 0) };
}

/**
 * One transaction of the history, as needed to interpret an undo operation.
 * See {@link applyUndoOperationToModels}.
 */
export interface UndoHistoryTransaction {
  /** Client-generated transaction id. */
  clientId: string;
  /** Operations of the transaction, in order. */
  operations: OperationInModel[];
  /**
   * Entity states before the transaction, per model. Null when the
   * transaction's events were not recorded at all.
   */
  downEvents: TransactionEvents | null;
}

/**
 * Interprets an undo operation, cancelling the referenced transaction as a
 * whole - across every model it touched, including the project model - as if
 * its operations never happened.
 *
 * The final state is computed from the project history (oldest first, up to
 * and including the transaction the current state reflects): the state is
 * rewound to before the earliest transaction ever targeted by an undo, by
 * patching the recorded down events in reverse order, and the operations of
 * the transactions from that point on are replayed, skipping transactions that
 * are effectively cancelled (see {@link resolveCancelledTransactions}) and undo
 * operations themselves, whose effect the replay already accounts for. The
 * type a model's operations are interpreted with follows from the project
 * model state of the replay itself, so models the undo restores are replayed
 * the same way as models that existed all along.
 *
 * `loadModelEntities` provides the current state of a model, an empty record
 * for models that do not exist (anymore). It is called for every model the
 * undo may change, including the project model.
 *
 * Returns the new state of all those models. The project model state is the
 * new structure of the project, which the caller is expected to reconcile with
 * the actual resources. Returns null when the undo cannot be interpreted - the
 * referenced transaction is not in the history, or a transaction that would
 * have to be rewound has no recorded events. The caller should then only
 * record the operation, per the {@link Operation} contract.
 */
export async function applyUndoOperationToModels(
  undoOperation: UndoOperation,
  history: UndoHistoryTransaction[],
  loadModelEntities: (modelId: ModelIdentifier) => Promise<EntityRecord>,
): Promise<Record<ModelIdentifier, EntityRecord> | null> {
  // Find the earliest transaction targeted by any undo operation: everything
  // before it is unaffected by any cancellation, so it is a safe point to
  // rewind to and replay from. Undo targets that are not part of the history
  // never had an effect and are skipped.
  const indexByClientId = new Map<string, number>();
  history.forEach((transaction, index) => indexByClientId.set(transaction.clientId, index));

  let earliestIndex = indexByClientId.get(undoOperation.cancelTransactionId);
  if (earliestIndex === undefined) {
    return null;
  }

  for (const transaction of history) {
    for (const { operation } of transaction.operations) {
      if (isUndoOperation(operation)) {
        const index = indexByClientId.get(operation.cancelTransactionId);
        if (index !== undefined && index < earliestIndex) {
          earliestIndex = index;
        }
      }
    }
  }

  // Transactions that changed something but have no recorded events cannot be
  // rewound through.
  for (let index = earliestIndex; index < history.length; index++) {
    if (history[index]!.downEvents === null && history[index]!.operations.length > 0) {
      return null;
    }
  }

  // Cancellation is resolved on the history extended by the undo operation
  // being applied, participating as the last, not yet recorded transaction; as
  // client-generated ids are always uuids, "current" cannot collide with them.
  const cancelled = resolveCancelledTransactions([
    ...history.map((transaction): Transaction => ({ id: transaction.clientId, operations: transaction.operations })),
    { id: "current", operations: [{ modelId: PROJECT_MODEL_ID, operation: undoOperation }] },
  ]);

  // Models the rewind and the replay touch. The project model is always
  // included, as it resolves the type of all the others.
  const modelIds = new Set<ModelIdentifier>([PROJECT_MODEL_ID]);
  for (let index = earliestIndex; index < history.length; index++) {
    Object.keys(history[index]!.downEvents ?? {}).forEach((modelId) => modelIds.add(modelId));
    history[index]!.operations.forEach(({ modelId }) => modelIds.add(modelId));
  }

  const states: Record<ModelIdentifier, EntityRecord> = {};
  for (const modelId of modelIds) {
    states[modelId] = { ...(await loadModelEntities(modelId)) };
  }

  // Rewind to the state before the earliest affected transaction.
  for (let index = history.length - 1; index >= earliestIndex; index--) {
    for (const [modelId, events] of Object.entries(history[index]!.downEvents ?? {})) {
      const working = (states[modelId] ??= {});
      for (const [entityId, entity] of Object.entries(events)) {
        if (entity === null) {
          delete working[entityId];
        } else {
          working[entityId] = entity;
        }
      }
    }
  }

  // Replay the effective operations on top of it.
  for (let index = earliestIndex; index < history.length; index++) {
    if (cancelled.has(history[index]!.clientId)) {
      continue;
    }
    for (const [modelId, operations] of groupTransactionOperations(history[index]!.operations).groups) {
      const modelType = (states[PROJECT_MODEL_ID]?.[modelId] as ProjectModelEntity | undefined)?.modelType ?? NAMED_BLOB_STORE_TYPE;
      const previousProjectEntities = states[PROJECT_MODEL_ID];
      states[modelId] = applyOperationsToModelEntities(modelId, modelType, states[modelId] ?? {}, operations);
      if (modelId === PROJECT_MODEL_ID) {
        clearRemovedModels(states, previousProjectEntities ?? {}, states[PROJECT_MODEL_ID]!);
      }
    }
  }

  return states;
}

/**
 * Empties the state of every model that the project structure no longer
 * contains, mirroring that the content of a model is deleted together with it.
 * Covers the named stores of the model as well.
 */
function clearRemovedModels(states: Record<ModelIdentifier, EntityRecord>, previousProjectEntities: EntityRecord, nextProjectEntities: EntityRecord): void {
  for (const modelId of Object.keys(previousProjectEntities)) {
    if (nextProjectEntities[modelId] !== undefined) {
      continue;
    }
    for (const stateModelId of Object.keys(states)) {
      if (splitModelId(stateModelId).iri === modelId) {
        states[stateModelId] = {};
      }
    }
  }
}
