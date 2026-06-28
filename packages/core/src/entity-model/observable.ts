import type { Entity } from "./entity.ts";

interface BaseEntityChange<T extends Entity = Entity> {
  /**
   * Previous state of the entity (before this change).
   * If the entity was created, this is null.
   */
  previous: T | null;

  /**
   * Current state of the entity (after this change).
   * If the entity was deleted, this is null.
   */
  next: T | null;
}

export interface EntityChangeCreated<T extends Entity = Entity> extends BaseEntityChange<T> {
  previous: null;
  next: T;
}

export interface EntityChangeDeleted<T extends Entity = Entity> extends BaseEntityChange<T> {
  previous: T;
  next: null;
}

export interface EntityChangeUpdated<T extends Entity = Entity> extends BaseEntityChange<T> {
  previous: T;
  next: T;
}

export type EntityChange<T extends Entity = Entity> =
  | EntityChangeCreated<T>
  | EntityChangeDeleted<T>
  | EntityChangeUpdated<T>;

export interface EntityModelChangeEvent {
  entityChanges: EntityChange[];
}

export interface ObservableEntityModel {
  /**
   * Subscribes to all entity changes (including the main entity) in the model.
   *
   * @returns Unsubscribe function.
   */
  subscribeToEntityChanges(listener: (entityChaneEvent: EntityModelChangeEvent) => void): () => void;
}
