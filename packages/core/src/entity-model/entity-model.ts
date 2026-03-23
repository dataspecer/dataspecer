import type { Model } from "../model/model.ts";
import type { Entity, EntityIdentifier, EntityList } from "./entity.ts";

/**
 * Entity model is a capability of a model to provide entities. This does not
 * necessarily mean that everything from the model can be obtained via entities.
 *
 * To simplify the implementation, each entity model has to provide a main
 * entity. A main entity is an entity in that model that describes the model
 * itself. Pure entity models (meaning models that are just a collection of
 * entities) can be accessed only via its entities, including the metadata about
 * the model which are stored in the main entity.
 */
export interface EntityModel<T extends Entity = Entity, MainEntity extends Entity = Entity> extends Model {
  /**
   * The main entity is the entity that describes the model itself.
   *
   * Its ID is the ID of the model.
   */
  getMainEntity(): MainEntity;

  /**
   * This must include the main entity.
   */
  getEntities(): EntityList<T | MainEntity>;

  /**
   * Returns single entity from the model or null, if the entity does not exists
   * or if the id is null or undefined.
   */
  getEntity(id: EntityIdentifier | null | undefined): T | MainEntity | null;
}

export function isEntityModel(thing: unknown): thing is EntityModel {
  return (
    typeof thing === "object" &&
    thing !== null &&
    "getMainEntity" in thing &&
    "getEntities" in thing &&
    "getEntity" in thing
  );
}

export const MainEntityType = "http://dataspecer.com/core/entity-model/main-entity" as const;

export function isMainEntity(entity: Entity): boolean {
  return entity.type.includes(MainEntityType);
}
