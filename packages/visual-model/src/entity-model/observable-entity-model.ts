import { Entity } from "./entity.ts";
import { TypedObject, isTypedObject } from "./typed-object.ts";

/**
 * Introduce observer pattern for a collection of entities.
 */
export interface ObservableEntityModel extends TypedObject {

  subscribeToChanges(listener: EntityEventListener): UnsubscribeCallback;

}

export interface EntityEventListener {

  /**
   * @param created Entities as created with assigned identifiers.
   * @param changed New state of changed entities.
   * @param removed Identifiers of removed entities.
   */
  entitiesDidChange: (created: Entity[], changed: Entity[], removed: string[]) => void;

}

export type UnsubscribeCallback = () => void;

export const ObservableEntityModelType = "observable-entity-model";

export function isObservableEntityModel(what: unknown): what is ObservableEntityModel {
  return isTypedObject(what) && what.getTypes().includes(ObservableEntityModelType);
}
