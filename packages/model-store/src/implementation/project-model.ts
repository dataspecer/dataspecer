import type { PackageService } from "@dataspecer/core-v2/project";
import { diffEntities, type EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import {
  applyOperationsToVirtualProjectModel,
  isPackageEntity,
  loadProjectStructure,
  type CreateModelOperation,
  type PackageEntity,
  type ProjectModelEntity,
} from "@dataspecer/core/project-model";
import { deepEqual } from "@dataspecer/utilities";
import type { ModelInModelStore, StateResult } from "./interface.ts";

/**
 * Drops entities that are not reachable from the root package, as the project
 * structure is a tree. Modifies the given record.
 */
function pruneUnreachableEntities(entities: EntityRecord<ProjectModelEntity>, rootId: ModelIdentifier): void {
  const reachable = new Set<ModelIdentifier>();
  const toVisit = [rootId];
  while (toVisit.length > 0) {
    const current = toVisit.pop()!;
    if (reachable.has(current)) {
      continue;
    }
    const entity = entities[current];
    if (entity === undefined) {
      continue;
    }
    reachable.add(current);
    if (isPackageEntity(entity)) {
      toVisit.push(...entity.subModels);
    }
  }

  for (const id in entities) {
    if (!reachable.has(id)) {
      delete entities[id];
    }
  }
}

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

  private asyncListeners: ((stateResult: StateResult) => void)[] = [];

  /**
   * Reused projects whose structure is currently being loaded, so that they
   * are not requested again before they appear in the state.
   */
  private loadingProjects: Set<ModelIdentifier> = new Set();

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

  subscribeForAsyncChanges(listener: (stateResult: StateResult) => void): () => void {
    this.asyncListeners.push(listener);
    return () => {
      this.asyncListeners = this.asyncListeners.filter((registered) => registered !== listener);
    };
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
   * @internal Brings the structure in line with the projects reused by the
   * project's packages, as declared by their content, which the project model
   * itself does not see: structures of newly reused projects are loaded and
   * attached as sub-packages, no longer reused ones are dropped.
   *
   * @param reusedProjectIds Reused projects per package. Packages whose
   * content is not known (yet) must be left out.
   * @returns Promise of the load, or null when nothing changed.
   */
  synchronizeReusedProjects(reusedProjectIds: Record<ModelIdentifier, ModelIdentifier[]>): Promise<void> | null {
    const toAdd: [packageId: ModelIdentifier, projectId: ModelIdentifier][] = [];
    let removed = false;

    const coreState = { ...this.coreState };
    for (const [packageId, projectIds] of Object.entries(reusedProjectIds)) {
      const packageEntity = coreState[packageId];
      if (packageEntity === undefined || !isPackageEntity(packageEntity)) {
        continue;
      }

      const noLongerReused = packageEntity.reusedProjects.filter((id) => !projectIds.includes(id));
      if (noLongerReused.length > 0) {
        const detached: PackageEntity = {
          ...packageEntity,
          subModels: packageEntity.subModels.filter((id) => !noLongerReused.includes(id)),
          reusedProjects: packageEntity.reusedProjects.filter((id) => !noLongerReused.includes(id)),
        };
        coreState[packageId] = detached;
        removed = true;
      }

      // A project that is already part of the structure keeps its place, so
      // that every model has exactly one parent.
      toAdd.push(
        ...projectIds
          .filter((id) => coreState[id] === undefined && !this.loadingProjects.has(id))
          .map((id): [ModelIdentifier, ModelIdentifier] => [packageId, id]),
      );
    }

    if (removed) {
      pruneUnreachableEntities(coreState, this.rootProjectId);
      this.notifyAsyncListeners(this.setStateWithMetadata(coreState));
    }

    if (toAdd.length === 0) {
      return null;
    }
    return this.loadReusedProjects(toAdd);
  }

  private async loadReusedProjects(toAdd: [packageId: ModelIdentifier, projectId: ModelIdentifier][]): Promise<void> {
    toAdd.forEach(([, projectId]) => this.loadingProjects.add(projectId));
    let structures: ProjectModelEntity[][];
    try {
      structures = await Promise.all(toAdd.map(([, projectId]) => loadProjectStructure(this.service, projectId)));
    } finally {
      toAdd.forEach(([, projectId]) => this.loadingProjects.delete(projectId));
    }

    const coreState = { ...this.coreState };
    for (const [index, [packageId, projectId]] of toAdd.entries()) {
      const packageEntity = coreState[packageId];
      // The structure may have changed while the project was being loaded.
      if (packageEntity === undefined || !isPackageEntity(packageEntity) || coreState[projectId] !== undefined) {
        continue;
      }

      const added = structures[index]!.filter((entity) => coreState[entity.id] === undefined);
      const addedIds = new Set(added.map((entity) => entity.id));
      for (const entity of added) {
        if (isPackageEntity(entity)) {
          // Anything already present keeps its place in the structure, so that
          // every model still has exactly one parent.
          const attached: PackageEntity = {
            ...entity,
            subModels: entity.subModels.filter((id) => addedIds.has(id)),
            reusedProjects: entity.reusedProjects.filter((id) => addedIds.has(id)),
          };
          coreState[entity.id] = attached;
        } else {
          coreState[entity.id] = entity;
        }
      }
      if (coreState[projectId] === undefined) {
        // The reused project does not exist (anymore).
        continue;
      }

      const reusingPackage: PackageEntity = {
        ...packageEntity,
        subModels: [...packageEntity.subModels, projectId],
        reusedProjects: [...packageEntity.reusedProjects, projectId],
      };
      coreState[packageId] = reusingPackage;
    }

    this.notifyAsyncListeners(this.setStateWithMetadata(coreState));
  }

  private notifyAsyncListeners(stateResult: StateResult): void {
    if (stateResult.diff.length === 0) {
      return;
    }
    for (const listener of this.asyncListeners) {
      listener(stateResult);
    }
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
