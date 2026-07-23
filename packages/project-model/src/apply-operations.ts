import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import { isCreateModelOperation, isRemoveModelOperation, type CreateModelOperation } from "./operations.ts";
import { PROJECT_MODEL_MODEL_ENTITY, type PackageEntity, type ProjectModelEntity } from "./model.ts";

/**
 * Applies project-model operations (create/remove model) to the given entities.
 * This is only a virtual model, you still need to physically create the model
 * in backend.
 */
export function applyOperationsToVirtualProjectModel(entities: EntityRecord<ProjectModelEntity>, operations: Operation[]): void {
  for (const operation of operations) {
    if (isRemoveModelOperation(operation)) {
      applyRemoveModelOperation(entities, operation.modelId);
    } else if (isCreateModelOperation(operation)) {
      applyCreateModelOperation(entities, operation);
    }
    // Per the Operation contract, operations that cannot be executed are ignored.
  }
}

function applyRemoveModelOperation(entities: EntityRecord<ProjectModelEntity>, modelId: string): void {
  const toDelete = [modelId];
  while (toDelete.length > 0) {
    const current = toDelete.pop()!;
    const currentEntity = entities[current];
    if (!currentEntity) {
      continue;
    }
    delete entities[current];

    if (currentEntity.modelType === LOCAL_PACKAGE) {
      const packageEntity = currentEntity as PackageEntity;
      packageEntity.subModels.forEach((subModelId) => toDelete.push(subModelId));
    }
  }

  // Remove the (now deleted) model from its parent package's subModels list.
  for (const id in entities) {
    const entity = entities[id];
    if (entity.modelType !== LOCAL_PACKAGE) {
      continue;
    }
    const packageEntity = entity as PackageEntity;
    if (!packageEntity.subModels.includes(modelId)) {
      continue;
    }
    entities[id] = {
      ...packageEntity,
      subModels: packageEntity.subModels.filter((subModelId) => subModelId !== modelId),
    } as PackageEntity;
    break;
  }
}

function applyCreateModelOperation(entities: EntityRecord<ProjectModelEntity>, operation: CreateModelOperation): void {
  // Skip if model already exists
  if (entities[operation.modelId]) {
    return;
  }
  // Skip if the parent package does not exist (it was probably removed) or
  // is not a package.
  // @todo Is this the correct logic?
  const parentEntity = entities[operation.parentPackageId];
  if (!parentEntity || parentEntity.modelType !== LOCAL_PACKAGE) {
    return;
  }
  let newEntity = {
    id: operation.modelId,
    type: [PROJECT_MODEL_MODEL_ENTITY],
    label: {},
    description: {},
    modelType: operation.modelType,
  } satisfies ProjectModelEntity;

  if (operation.modelType === LOCAL_PACKAGE) {
    const packageEntity: PackageEntity = {
      ...newEntity,
      modelType: LOCAL_PACKAGE,
      subModels: [],
    };
    newEntity = packageEntity;
  }

  entities[operation.modelId] = newEntity;

  // Now modify the parent package
  entities[operation.parentPackageId] = {
    ...parentEntity,
    subModels: [...(parentEntity as PackageEntity).subModels, operation.modelId],
  } as PackageEntity;
}
