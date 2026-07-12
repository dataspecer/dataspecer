import { LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import { changesToSemanticModelOperations } from "@dataspecer/core-v2/semantic-model/operations";
import type { CoreOperationAndOperation, CoreResourceAndEntity } from "@dataspecer/core/core";
import { applyOperationsToStructureModel } from "@dataspecer/core/data-psm";
import { changesToEntityOperations, diffEntities, type EntityRecord } from "@dataspecer/core/entity-model";
import {
  isRemoveEntityOperation,
  isSetEntityOperation,
  isUpdateEntityOperation,
  type Operation,
  type OperationInModel,
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
 * Diffs two states of a model of the given type and returns operations that
 * would transform the previous state into the next one, tagged with the id of
 * the model they belong to.
 *
 * For the semantic model, semantic and profile operations are generated where
 * possible. Everything else (including all entities of other model types)
 * falls back to the generic set/update/remove entity operations.
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

  operations.push(...changesToEntityOperations(remainingChanges));

  return operations.map((operation) => ({ modelId, operation }));
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
