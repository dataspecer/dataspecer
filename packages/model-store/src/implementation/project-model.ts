import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { PackageService } from "@dataspecer/core-v2/project";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { isCreateModelOperation, isRemoveModelOperation, loadProjectStructure, type ModelEntity, type PackageEntity } from "@dataspecer/project-model";
import { BaseModelInModelStore, type ModelState } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";

/**
 * Adapter for project model into model store.
 *
 * Provides entities that represent the project structure and can modify the project via operations.
 */
export class ProjectModelInModelStore extends BaseModelInModelStore<ModelEntity> implements Model, ModelInDefaultFrontendModelStore {
  rootProjectId: ModelIdentifier;
  protected service: PackageService;

  constructor(id: string, service: PackageService, rootProjectId: ModelIdentifier) {
    super(id);
    this.service = service;
    this.rootProjectId = rootProjectId;
  }

  protected async loadInternal(): Promise<ModelState<ModelEntity>> {
    const entities = await loadProjectStructure(this.service, this.rootProjectId);
    return {
      operations: [],
      entities: Object.fromEntries(entities.map((e) => [e.id, e])) as EntityRecord<ModelEntity>,
    };
  }

  protected saveInternal(_state: ModelState<ModelEntity>): Promise<void> {
    throw new Error("Method not implemented.");
  }

  protected override applyOperation(operation: Operation, mutableState: EntityRecord<ModelEntity>): void {
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
      // Skip if parent model does not exists as it was probably removed
      // @todo Is this the correct logic?
      if (!mutableState[operation.parentPackageId]) {
        return;
      }
      let newEntity = {
        id: operation.modelId,
        type: [] as string[],
        label: {},
        description: {},
        modelType: operation.modelType,
      } satisfies ModelEntity;

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
        ...mutableState[operation.parentPackageId],
        subModels: [...(mutableState[operation.parentPackageId] as PackageEntity).subModels, operation.modelId],
      } as PackageEntity;
      return;
    }

    throw new Error(`Unsupported operation type ${operation.type} for project model.`);
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
