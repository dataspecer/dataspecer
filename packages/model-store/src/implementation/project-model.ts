import type { PackageService } from "@dataspecer/core-v2/project";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { applyOperationsToVirtualProjectModel, loadProjectStructure, type ProjectModelEntity } from "@dataspecer/project-model";
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
    applyOperationsToVirtualProjectModel(mutableState, [operation]);
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
