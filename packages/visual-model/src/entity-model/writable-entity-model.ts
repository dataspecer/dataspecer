import { Entity } from "./entity.ts";
import { TypedObject, isTypedObject } from "./typed-object.ts";

export type NewEntity <T extends Entity> = Omit<T, "identifier">;

export type ChangeEntity <T extends Entity> = Partial<Omit<T, "identifier" | "type">>;

/**
 * Allow for modification of entities.
 */
export interface WritableEntityModel extends TypedObject {

  /**
   * Bulk change operation, use this when performing multiple change
   */
  modifyEntities<T extends Entity>(create: NewEntity<T>[], change: Record<string, ChangeEntity<T>>, remove: string[]): Promise<void>;

}

export const WritableEntityModelType = "writable-entity-model";

export function isWritableEntityModel(what: unknown): what is WritableEntityModel {
  return isTypedObject(what) && what.getTypes().includes(WritableEntityModelType);
}
