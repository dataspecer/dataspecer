import type { Model } from "../model/model.ts";
import type { Entity, EntityIdentifier, EntityArray } from "./entity.ts";

/**
 * Entity model is a capability of a model to provide entities. This does not
 * necessarily mean that everything from the model can be obtained via entities.
 *
 * As an extreme example, consider a model that represents an uploaded file,
 * such as an image for HTML documentation. In this case, it would be highly
 * inefficient to represent the file as a JSON-serializable entity. Instead, the
 * model provides its own API to access the file data more efficiently.
 *
 * To simplify the implementation, each entity model has to provide a main
 * entity. A main entity is an entity in that model that describes the model
 * itself. Pure entity models (meaning models that are just a collection of
 * entities) can be accessed only via its entities, including the metadata about
 * the model which are stored in the main entity.
 *
 * To further simplify the implementation, every model in Dataspecer is an
 * entity model, thus providing a main entity. Most models are pure entity
 * models, but some models may have additional capabilities.
 */
export interface EntityModel<EntityType extends Entity = Entity, MainEntityType extends EntityType = EntityType> extends Model {
  /**
   * The main entity is the entity that describes the model itself.
   *
   * Its ID is the ID of the model.
   */
  getMainEntity(): MainEntityType;

  /**
   * This must include the main entity.
   * @todo is this always the same object, can I cahnge it, etc.
   */
  getEntities(): EntityArray<EntityType | MainEntityType>;

  /**
   * Returns single entity from the model or null, if the entity does not exists
   * or if the id is null or undefined.
   */
  getEntity(id: EntityIdentifier | null | undefined): EntityType | MainEntityType | null;
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
