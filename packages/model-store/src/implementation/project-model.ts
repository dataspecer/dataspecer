import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import type { PackageService } from "@dataspecer/core-v2/project";
import type { EntityChange } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { isCreateModelOperation, isRemoveModelOperation, loadProjectStructure, type ModelEntity, type PackageEntity } from "@dataspecer/project-model";
import { v7 as uuidv7 } from "uuid";
import { diffEntities } from "../utilities.ts";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";

/**
 * Adapter for project model into model store.
 *
 * Provides entities that represent the project structure and can modify the project via operations.
 */
export class ProjectModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  id: string;
  protected service: PackageService;
  protected entities: Record<string, ModelEntity> = {};

  constructor(id: string, service: PackageService) {
    this.id = id;
    this.service = service;
  }

  applyOperations(operations: Operation[]): ApplyOperationResult {
    const newEntityList = { ...this.entities };
    for (const operation of operations) {
      if (isRemoveModelOperation(operation)) {
        const toDelete = [operation.modelId];
        while (toDelete.length > 0) {
          const current = toDelete.pop()!;
          const currentEntity = newEntityList[current];
          if (!currentEntity) {
            continue;
          }
          delete newEntityList[current];

          if (currentEntity.modelType === LOCAL_PACKAGE) {
            const packageEntity = currentEntity as PackageEntity;
            packageEntity.subModels.forEach((subModelId) => toDelete.push(subModelId));
          }
        }
      } else if (isCreateModelOperation(operation)) {
        // Skip if model already exists
        if (newEntityList[operation.modelId]) {
          continue;
        }
        // Skip if parent model does not exists as it was probably removed
        // @todo Is this the correct logic?
        if (!newEntityList[operation.parentPackageId]) {
          continue;
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

        // Now modify the parent package
        newEntityList[operation.parentPackageId] = {
          ...newEntityList[operation.parentPackageId],
          subModels: [...(newEntityList[operation.parentPackageId] as PackageEntity).subModels, operation.modelId],
        } as PackageEntity;
      } else {
        throw new Error(`Unsupported operation type ${operation.type} for project model.`);
      }
    }
    const diff = diffEntities(this.entities, newEntityList);
    this.entities = newEntityList;
    return {
      entityChanges: diff,
      transactionId: uuidv7(),
    };
  }

  protected externalChangesSubscribers: ((changes: EntityChange[]) => void)[] = [];

  subscribeForAsyncChanges(listener: (changes: EntityChange[]) => void): () => void {
    this.externalChangesSubscribers.push(listener);
    return () => {
      this.externalChangesSubscribers = this.externalChangesSubscribers.filter((l) => l !== listener);
    };
  }

  protected internalNotifyExternalChanges(changes: EntityChange[]): void {
    for (const listener of this.externalChangesSubscribers) {
      listener(changes);
    }
  }

  async load(): Promise<void> {
    const entities = await loadProjectStructure(this.service, this.id);
    const diff = diffEntities(this.entities, Object.fromEntries(entities.map((e) => [e.id, e])));
    this.entities = Object.fromEntries(entities.map((e) => [e.id, e]));
    this.internalNotifyExternalChanges(diff);
  }

  save(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export function createProjectModel(projectId: ModelIdentifier, context: {
  service: PackageService;
}): Model & ModelInDefaultFrontendModelStore {
  return new ProjectModelInModelStore(projectId, context.service);
}
