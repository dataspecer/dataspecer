import { TypedObject, isTypedObject } from "./typed-object.ts";

export interface SerializableModel extends TypedObject {

  /**
   * Convert model into JSON object compatible with Dataspecer API.
   */
  serializeModelToApiJsonObject(): object;

}

export const SerializableModelType = "serializable-model";

export function isSerializableModel(what: unknown): what is SerializableModel {
  return isTypedObject(what) && what.getTypes().includes(SerializableModelType);
}
