import type { EntityRecord } from "../entity-model/entity.ts";
import type { Operation } from "../operation/operation.ts";
import { PACKAGE_MODEL, PROJECT_MODEL_MODEL_ENTITY, type PackageEntity, type ProjectModelEntity } from "./model.ts";
import { isCreateModelOperation, isCreateProjectOperation, isRemoveModelOperation, type CreateModelOperation, type CreateProjectOperation } from "./operations.ts";

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
    } else if (isCreateProjectOperation(operation)) {
      applyCreateProjectOperation(entities, operation);
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

    if (currentEntity.modelType === PACKAGE_MODEL) {
      const packageEntity = currentEntity as PackageEntity;
      // Remove own packages, not reused ones
      packageEntity.subModels.filter((subModelId) => !packageEntity.reusedProjects.includes(subModelId)).forEach((subModelId) => toDelete.push(subModelId));
    }
  }

  // Remove the (now deleted) model from its parent package's lists.
  for (const id in entities) {
    const entity = entities[id];
    if (entity.modelType !== PACKAGE_MODEL) {
      continue;
    }
    const packageEntity = entity as PackageEntity;
    if (!packageEntity.subModels.includes(modelId)) {
      continue;
    }
    entities[id] = {
      ...packageEntity,
      subModels: packageEntity.subModels.filter((subModelId) => subModelId !== modelId),
      reusedProjects: packageEntity.reusedProjects.filter((subModelId) => subModelId !== modelId),
    } as PackageEntity;
    break;
  }
}

/**
 * A project is the root package of its own project model, so it is created as
 * an empty package entity.
 */
function applyCreateProjectOperation(entities: EntityRecord<ProjectModelEntity>, operation: CreateProjectOperation): void {
  if (entities[operation.projectId]) {
    return;
  }

  const projectEntity: PackageEntity = {
    id: operation.projectId,
    type: [PROJECT_MODEL_MODEL_ENTITY],
    label: operation.label ?? {},
    description: operation.description ?? {},
    modelType: PACKAGE_MODEL,
    subModels: [],
    projectId: operation.projectId,
    reusedProjects: [],
  };
  entities[operation.projectId] = projectEntity;
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
  if (!parentEntity || parentEntity.modelType !== PACKAGE_MODEL) {
    return;
  }
  let newEntity = {
    id: operation.modelId,
    type: [PROJECT_MODEL_MODEL_ENTITY],
    label: operation.label ?? {},
    description: operation.description ?? {},
    modelType: operation.modelType,
    // A model belongs to the project of the package it is created in, which
    // may be a reused project.
    projectId: parentEntity.projectId,
  } satisfies ProjectModelEntity;

  if (operation.modelType === PACKAGE_MODEL) {
    const packageEntity: PackageEntity = {
      ...newEntity,
      modelType: PACKAGE_MODEL,
      subModels: [],
      reusedProjects: [],
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
