import type { PackageService } from "@dataspecer/core-v2/project";
import { diffEntities, type EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { applyOperationsToVirtualProjectModel, loadProjectStructure, type CreateModelOperation, type ProjectModelEntity } from "@dataspecer/core/project-model";
import { deepEqual } from "@dataspecer/utilities";
import type { ModelInModelStore, StateResult } from "./interface.ts";

/**
 * Adapter for project model into model store.
 *
 * Provides entities that represent the project structure and can modify the
 * project via operations. Metadata of the individual models (label and
 * description) is read from their content by the model store and layered over
 * the core state, hence it is part of the output state only.
 */
export class ProjectModelInModelStore implements ModelInModelStore {
  private readonly service: PackageService;
  private readonly rootProjectId: ModelIdentifier;

  private coreState: EntityRecord<ProjectModelEntity> = {};
  private outputState: EntityRecord<ProjectModelEntity> = {};

  private metadata: Record<ModelIdentifier, ModelMetadata> = {};

  constructor(service: PackageService, rootProjectId: ModelIdentifier) {
    this.service = service;
    this.rootProjectId = rootProjectId;
  }

  setState(coreState: EntityRecord): StateResult {
    return this.setStateWithMetadata(coreState as EntityRecord<ProjectModelEntity>);
  }

  applyOperationAndSetState(operations: Operation[]): StateResult {
    const coreState = { ...this.coreState };
    applyOperationsToVirtualProjectModel(coreState, operations);
    return this.setStateWithMetadata(coreState);
  }

  subscribeForAsyncChanges(): () => void {
    return () => {};
  }

  async getRemoteState(): Promise<EntityRecord> {
    const entities = await loadProjectStructure(this.service, this.rootProjectId);
    const coreState: EntityRecord<ProjectModelEntity> = {};
    for (const entity of entities) {
      coreState[entity.id] = entity;
    }
    return coreState;
  }

  /**
   * @internal Sets metadata of the given models as computed from their content
   * by the model store.
   */
  setModelsMetadata(metadata: Record<ModelIdentifier, ModelMetadata>): StateResult {
    let changed = false;
    for (const modelId in metadata) {
      if (deepEqual(this.metadata[modelId], metadata[modelId])) {
        continue;
      }
      this.metadata[modelId] = metadata[modelId];
      changed = true;
    }

    if (!changed) {
      return { coreState: this.coreState, outputState: this.outputState, diff: [] };
    }
    return this.setStateWithMetadata(this.coreState);
  }

  private setStateWithMetadata(coreState: EntityRecord<ProjectModelEntity>): StateResult {
    const outputState: EntityRecord<ProjectModelEntity> = {};
    for (const id in coreState) {
      const entity = coreState[id];
      const metadata = this.metadata[id];
      outputState[id] = metadata === undefined ? entity : { ...entity, label: metadata.label, description: metadata.description };
    }

    const diff = diffEntities(this.outputState, outputState);
    this.coreState = coreState;
    this.outputState = outputState;
    return { coreState, outputState, diff };
  }
}

export function createProjectModel(
  _modelId: ModelIdentifier,
  context: {
    service: PackageService;
    rootProjectId: ModelIdentifier;
  },
): ProjectModelInModelStore {
  return new ProjectModelInModelStore(context.service, context.rootProjectId);
}
