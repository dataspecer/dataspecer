import { diffEntities, type EntityChange, type EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import type { EntityObservableModelStore, ObservableEntityModelStoreChangeEvent } from "@dataspecer/model-store";
import { buildModelHierarchy, isModelHierarchyRelevantChange } from "./build.ts";
import type { ModelHierarchyEntity } from "./entities.ts";

export interface ModelHierarchyChangeEvent {
  entityChanges: EntityChange<ModelHierarchyEntity>[];
}

/**
 * Virtual model whose entities are {@link ModelHierarchyEntity}, one per
 * semantic model and package, describing dependencies and the models each
 * package exposes.
 *
 * Mirrors the `getAllEntities`/`subscribeToEntityChanges` naming used by
 * `@dataspecer/model-store` - there is no shared interface for this shape yet.
 */
export class ModelHierarchyModel {
  private readonly rootProjectModelId: ModelIdentifier;
  private entities: EntityRecord<ModelHierarchyEntity> = {};
  private subscribers: ((event: ModelHierarchyChangeEvent) => void)[] = [];
  private readonly modelStoreGetAllEntities: () => Record<ModelIdentifier, EntityRecord>;
  private readonly modelStoreSubscribeToEntityChanges: (listener: (entityChanges: ObservableEntityModelStoreChangeEvent) => void) => () => void;

  constructor(
    rootProjectModelId: ModelIdentifier,
    getAllEntities: () => Record<ModelIdentifier, EntityRecord>,
    subscribeToEntityChanges: (listener: (entityChanges: ObservableEntityModelStoreChangeEvent) => void) => () => void,
  ) {
    this.rootProjectModelId = rootProjectModelId;
    this.modelStoreGetAllEntities = getAllEntities;
    this.modelStoreSubscribeToEntityChanges = subscribeToEntityChanges;
  }

  getAllEntities(): EntityRecord<ModelHierarchyEntity> {
    return this.entities;
  }

  subscribeToEntityChanges(listener: (event: ModelHierarchyChangeEvent) => void): () => void {
    this.subscribers.push(listener);
    return () => {
      this.subscribers = this.subscribers.filter((l) => l !== listener);
    };
  }

  initialize(): void {
    this.build(this.modelStoreGetAllEntities());
    this.modelStoreSubscribeToEntityChanges((changes) => {
      if (isModelHierarchyRelevantChange(changes.entityChanges)) {
        this.build(this.modelStoreGetAllEntities());
      }
    });
  }

  private build(allModels: Record<ModelIdentifier, EntityRecord>): void {
    const next = buildModelHierarchy(this.rootProjectModelId, allModels);
    const entityChanges = diffEntities(this.entities, next) as EntityChange<ModelHierarchyEntity>[];
    this.entities = next;
    if (entityChanges.length > 0) {
      for (const listener of this.subscribers) {
        listener({ entityChanges });
      }
    }
  }
}

/**
 * Creates a {@link ModelHierarchyModel} that stays in sync with `modelStore`
 * for as long as it is subscribed to.
 *
 * @param modelStore Model store to read the project's models from, see
 * {@link EntityObservableModelStore.getAllEntities} and
 * {@link EntityObservableModelStore.subscribeToEntityChanges}.
 * @param rootProjectModelId ID of the root package of the project.
 */
export function createModelHierarchyModel(modelStore: EntityObservableModelStore, rootProjectModelId: ModelIdentifier): ModelHierarchyModel {
  const model = new ModelHierarchyModel(
    rootProjectModelId,
    () => modelStore.getAllEntities(),
    (listener) => modelStore.subscribeToEntityChanges(listener)
  );

  return model;
}
