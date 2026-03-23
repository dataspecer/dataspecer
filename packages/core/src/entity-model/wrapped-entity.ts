import type { Entity } from "./entity.ts";

/**
 * Represents an entity that is wrapped so we can attach additional metadata to
 * it.
 */
export interface WrappedEntity<T extends Entity = Entity> {
  id: string;
  entity: T;
}

/**
 * Wrapper for entity with information about the model it belongs to.
 */
export interface EntityInModel<T extends Entity = Entity> extends WrappedEntity<T> {
  modelId: string;
}