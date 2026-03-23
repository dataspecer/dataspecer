import type { Entity, EntityIdentifier } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import type { ChangeEvent, ObservableModelStore } from "./observable.ts";

export interface EntityChange<T extends Entity = Entity> {
  id: EntityIdentifier;
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

export interface EntityChangeEvent<T extends Entity = Entity> extends ChangeEvent {
  entityChanges?: Map<ModelIdentifier, (EntityChangeCreated<T> | EntityChangeDeleted<T> | EntityChangeUpdated<T>)[]>;
}

export interface EntityObservableModelStore<T extends EntityChangeEvent = EntityChangeEvent> extends ObservableModelStore<T> {
}
