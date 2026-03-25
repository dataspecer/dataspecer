import type { Entity, EntityIdentifier } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";

export interface EntityChange<T extends Entity = Entity> {
  id: EntityIdentifier;
  modelId: ModelIdentifier;

  old: T | null;
  new: T | null;
}

export interface EntityChangeCreated<T extends Entity = Entity> extends EntityChange<T> {
  old: null;
}

export interface EntityChangeDeleted<T extends Entity = Entity> extends EntityChange<T> {
  new: null;
}

export interface EntityChangeUpdated<T extends Entity = Entity> extends EntityChange<T> {
  old: T;
  new: T;
}

export interface EntityChangeEvent {
  entityChanges: Map<ModelIdentifier, (EntityChangeCreated | EntityChangeDeleted | EntityChangeUpdated)[]>;
}

export interface EntityObservableModelStore {
  /**
   * Subscribes to entity changes across all models in the store. This is useful
   * for gathering all changes at once to avoid redundant multiple
   * notifications.
   *
   * The event fires synchronously upon transaction submission, provided that
   * changes have occurred.
   *
   * To synchronize with the current state, you need to subscribe and fetch the
   * state from the models.
   *
   * @returns Unsubscribe function.
   */
  subscribeToEntityChanges(listener: (change: EntityChangeEvent) => void): () => void;
}
