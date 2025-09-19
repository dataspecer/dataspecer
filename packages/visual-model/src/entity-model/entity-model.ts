import { Entity, EntityIdentifier } from "./entity.ts";
import { TypedObject } from "./typed-object.ts";

export type ModelIdentifier = string;

/**
 * Represents a collection of entities with simple read access.
 * By design this model is not provided with additional functionality or being extended.
 * Instead a new functionality is added in form of separate interfaces.
 * The ideas is for the consumer to define custom interface and thus declaring the required functionality.
 */
export interface EntityModel extends TypedObject {

  /**
   * @returns Model identifier.
   */
  getIdentifier(): ModelIdentifier;

  /**
   * @returns Entity with given identifier.
   */
  getEntity(identifier: EntityIdentifier): Promise<Entity | null>;

}
