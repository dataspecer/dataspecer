import { Entity, EntityIdentifier } from "./entity.ts";
import { TypedObject, isTypedObject } from "./typed-object.ts";
import { ChangeEntity, NewEntity } from "./writable-entity-model.ts";

/**
 * Allow for synchronous modification of entities.
 *
 * When paired with ObservableEntityModel all events from synchronous
 * operation must raise events as a part of the synchronous operation
 * execution.
 */
export interface SynchronousWritableEntityModel extends TypedObject {

  createEntitySync<T extends Entity>(entity: NewEntity<T>): EntityIdentifier;

  changeEntitySync<T extends Entity>(identifier: EntityIdentifier, entity: ChangeEntity<T>): void;

  deleteEntitySync(identifier: EntityIdentifier): void;

}

export const SynchronousWritableEntityModelType = "synchronous-writable-entity-model";

export function isSynchronousWritableEntityModel(what: unknown): what is SynchronousWritableEntityModel {
  return isTypedObject(what) && what.getTypes().includes(SynchronousWritableEntityModelType);
}
