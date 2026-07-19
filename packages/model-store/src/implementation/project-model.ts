import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { PackageService } from "@dataspecer/core-v2/project";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import {
  isCreateModelOperation,
  isRemoveModelOperation,
  loadProjectStructure,
  PROJECT_MODEL_MODEL_ENTITY,
  type PackageEntity,
  type ProjectModelEntity,
} from "@dataspecer/project-model";
import { deepEqual } from "@dataspecer/utilities";
import { BaseModelInModelStore, type ModelState } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";

/**
 * Adapter for project model into model store.
 *
 * Provides entities that represent the project structure and can modify the project via operations.
 */
export class ProjectModelInModelStore extends BaseModelInModelStore<ProjectModelEntity> implements Model, ModelInDefaultFrontendModelStore {
  rootProjectId: ModelIdentifier;
  protected service: PackageService;

  constructor(id: string, service: PackageService, rootProjectId: ModelIdentifier) {
    super(id);
    this.service = service;
    this.rootProjectId = rootProjectId;
  }

  /**
   * @internal function to append additional information to entities in the
   * project model. It is used to set metadata about models (label and
   * description) by reading the individual models and extracting the metadata
   * from them.
   */
  setModelMetadata(modelId: ModelIdentifier, metadata: ModelMetadata): EntityChange[] {
    const previous = this.getAllEntities()[modelId];
    if (!previous) {
      return [];
    }
    const next: ProjectModelEntity = { ...previous, label: metadata.label, description: metadata.description };
    if (deepEqual(previous, next)) {
      return [];
    }
    const changes = [{ previous, next } as EntityChange];
    this.externalChange(changes);
    return changes;
  }

  protected async loadInternal(): Promise<ModelState<ProjectModelEntity>> {
    const entities = await loadProjectStructure(this.service, this.rootProjectId);
    return {
      operations: [],
      entities: Object.fromEntries(entities.map((e) => [e.id, e])) as EntityRecord<ProjectModelEntity>,
    };
  }

  protected override applyOperation(operation: Operation, mutableState: EntityRecord<ProjectModelEntity>): void {
    if (isRemoveModelOperation(operation)) {
      const toDelete = [operation.modelId];
      while (toDelete.length > 0) {
        const current = toDelete.pop()!;
        const currentEntity = mutableState[current];
        if (!currentEntity) {
          continue;
        }
        delete mutableState[current];

        if (currentEntity.modelType === LOCAL_PACKAGE) {
          const packageEntity = currentEntity as PackageEntity;
          packageEntity.subModels.forEach((subModelId) => toDelete.push(subModelId));
        }
      }

      // Remove the (now deleted) model from its parent package's subModels list.
      for (const id in mutableState) {
        const entity = mutableState[id];
        if (entity.modelType !== LOCAL_PACKAGE) {
          continue;
        }
        const packageEntity = entity as PackageEntity;
        if (!packageEntity.subModels.includes(operation.modelId)) {
          continue;
        }
        mutableState[id] = {
          ...packageEntity,
          subModels: packageEntity.subModels.filter((subModelId) => subModelId !== operation.modelId),
        } as PackageEntity;
        break;
      }
      return;
    }

    if (isCreateModelOperation(operation)) {
      // Skip if model already exists
      if (mutableState[operation.modelId]) {
        return;
      }
      // Skip if the parent package does not exist (it was probably removed) or
      // is not a package.
      // @todo Is this the correct logic?
      const parentEntity = mutableState[operation.parentPackageId];
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

      mutableState[operation.modelId] = newEntity;

      // Now modify the parent package
      mutableState[operation.parentPackageId] = {
        ...parentEntity,
        subModels: [...(parentEntity as PackageEntity).subModels, operation.modelId],
      } as PackageEntity;
      return;
    }

    // Per the Operation contract, operations that cannot be executed are
    // ignored.
    console.warn(`Unsupported operation "${operation.type}" for the project model. The operation is ignored.`);
  }
}

export function createProjectModel(
  projectId: ModelIdentifier,
  context: {
    service: PackageService;
    rootProjectId: ModelIdentifier;
  },
): Model & ModelInDefaultFrontendModelStore {
  return new ProjectModelInModelStore(projectId, context.service, context.rootProjectId);
}
