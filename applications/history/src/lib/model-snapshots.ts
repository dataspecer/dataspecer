import { type CoreOperationAndOperation, type CoreResourceAndEntity } from "@dataspecer/core/core";
import { applyOperationsToStructureModel } from "@dataspecer/core/data-psm";
import { applyOperationsToEntityModel, type EntityRecord } from "@dataspecer/core/entity-model";
import { isSetEntityOperation, isUpdateEntityOperation, isRemoveEntityOperation, type Operation, type OperationInModel } from "@dataspecer/core/operation";
import { LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import { applyOperationsToAsyncQueryableModel } from "@dataspecer/model-store/implementation";
import { applyOperationsToVirtualProjectModel, isCreateModelOperation, type ProjectModelEntity } from "@dataspecer/project-model";
import { applyOperationsToVisualModel } from "@dataspecer/visual-model/executor";

/**
 * Replays a chronologically ordered history model-by-model, giving every
 * operation the full entity state of the model it targets, from just before
 * and just after the transaction it belongs to. Operations of the same
 * transaction targeting the same model share the same `before`/`after` pair
 * (the state is snapshotted once per transaction per model, not per
 * operation) — sufficient for e.g. a delete operation to name the entity it
 * removes, without the cost of a snapshot for every single operation.
 */
export interface ModelSnapshot {
  before: EntityRecord;
  after: EntityRecord;
}

/**
 * Applies operations to the entity record of one model, choosing how based
 * on the model's kind. Generic entity operations (set/update/remove) are
 * supported by every model and are always handled the same way, regardless of
 * kind. Mirrors the dispatch `BaseModelInModelStore.applyOperations` does
 * internally — replicated here since that dispatch is not itself exported.
 *
 * Replaying history can encounter operations that do not fit the model they
 * are recorded against (e.g. a stale operation from before a refactor); such
 * an operation is skipped rather than allowed to throw and break the whole
 * replay.
 */
function applyToModel(entities: EntityRecord, operations: Operation[], isProjectModel: boolean, modelType: string | undefined): void {
  for (const operation of operations) {
    try {
      if (isSetEntityOperation(operation) || isUpdateEntityOperation(operation) || isRemoveEntityOperation(operation)) {
        applyOperationsToEntityModel(entities, [operation]);
      } else if (isProjectModel) {
        applyOperationsToVirtualProjectModel(entities as EntityRecord<ProjectModelEntity>, [operation]);
      } else if (modelType === VISUAL_MODEL) {
        applyOperationsToVisualModel(entities, [operation]);
      } else if (modelType === V1.PSM) {
        applyOperationsToStructureModel(entities as EntityRecord<CoreResourceAndEntity>, [operation as CoreOperationAndOperation]);
      } else if (modelType === QUERYABLE_MODEL) {
        applyOperationsToAsyncQueryableModel(entities, [operation]);
      } else if (modelType === LOCAL_SEMANTIC_MODEL || modelType === RDFS_MODEL) {
        applyOperationsToSemanticModel(entities, [operation]);
      }
      // Otherwise (e.g. a blob model), only generic operations are expected;
      // an unrecognized non-generic operation is ignored.
    } catch (error) {
      console.warn(`Failed to replay operation "${operation.type}" for a model snapshot. Skipping it.`, error);
    }
  }
}

/**
 * Replays every transaction of a chronologically ordered history, returning,
 * in the same shape as the input, the entity record of the operation's model
 * from just before and just after the operation's transaction.
 *
 * `initialModelTypes` seeds the model type of models that already exist
 * before the replayed history starts (as `create-model` operations inside the
 * history are picked up automatically); `initialEntities` seeds their entity
 * state the same way — e.g. the evolution review screen replays only the
 * pending operations of a branch, on top of the current state of the models
 * they target.
 */
export function computeModelSnapshots(
  transactions: { operations: OperationInModel[] }[],
  initialModelTypes: Record<string, string>,
  projectModelId: string,
  initialEntities: Record<string, EntityRecord> = {},
): ModelSnapshot[][] {
  const modelTypes: Record<string, string> = { ...initialModelTypes };
  const working = new Map<string, EntityRecord>();
  const entitiesOf = (modelId: string): EntityRecord => {
    let entities = working.get(modelId);
    if (!entities) working.set(modelId, (entities = { ...(initialEntities[modelId] ?? {}) }));
    return entities;
  };

  const result: ModelSnapshot[][] = [];
  for (const transaction of transactions) {
    const byModel = new Map<string, Operation[]>();
    for (const { modelId, operation } of transaction.operations) {
      if (isCreateModelOperation(operation)) modelTypes[operation.modelId] = operation.modelType;
      byModel.set(modelId, [...(byModel.get(modelId) ?? []), operation]);
    }

    const snapshots = new Map<string, ModelSnapshot>();
    for (const [modelId, operations] of byModel) {
      const entities = entitiesOf(modelId);
      const before = { ...entities };
      const isProjectModel = modelId.split("#")[0] === projectModelId;
      const modelType = modelTypes[modelId.split("#")[0]!];
      applyToModel(entities, operations, isProjectModel, modelType);
      snapshots.set(modelId, { before, after: { ...entities } });
    }

    result.push(transaction.operations.map(({ modelId }) => snapshots.get(modelId)!));
  }
  return result;
}
