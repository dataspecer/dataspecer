import { Entity, EntityIdentifier } from "./entity.ts";
import { isTypedObject } from "./typed-object.ts";

/**
 * This model fits to the local machine.
 */
export interface SynchronousEntityModel {

  /**
   * Load all entities into the model preparing it for synchronous use.
   * This method must finish before any other method from this interface is executed.
   */
  initialize(): Promise<void>;

  /**
   * @param identifier
   * @returns Null if there is no entity with given identifier.
   */
  getEntitySync(identifier: EntityIdentifier): Entity | null;

  getEntitiesSync(): Entity[];

}

export const SynchronousEntityModelType = "synchronous-entity-model";

export function isSynchronousEntityModel(what: unknown): what is SynchronousEntityModel {
  return isTypedObject(what) && what.getTypes().includes(SynchronousEntityModelType);
}
