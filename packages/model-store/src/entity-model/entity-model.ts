import type { Entity, EntityIdentifier } from "./entity.ts";

export type EntitySet = Record<EntityIdentifier, Entity>;

export interface EntityModel {
  /**
   * Returns the main entity that describes the model.
   * Its ID is the ID of the model.
   */
  getMainEntity(): Entity;

  getEntity(identifier: EntityIdentifier): Entity | null;

  getEntities(): EntitySet;
}

export interface ObservableEntityModelChangeEvent {
  created: Entity[];
  updated: Entity[];
  deleted: EntityIdentifier[];
}

export interface ObservableEntityModel extends EntityModel {
  subscribeToChanges(listener: (event: ObservableEntityModelChangeEvent) => void): () => void;
}