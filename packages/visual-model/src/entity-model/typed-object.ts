/**
 * This interface allows us to query object for sub-types.
 * We could use guards testing member functions to determine object type.
 * Yet, at the same time we need an ability to express a desire to create an object implementing several interfaces.
 * That is why, we use strings to represent types instead.
 * In a guard we can simply check if given type is in the array.
 * When constructing the object we can pass array of required types.
 */
export interface TypedObject {

  getTypes(): string[];

}

export function isTypedObject(what: unknown): what is TypedObject {
  return typeof what === "object" && what !== null && "getTypes" in what;
}
