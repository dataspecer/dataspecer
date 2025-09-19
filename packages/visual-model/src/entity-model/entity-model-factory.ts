import { TypedObject } from "./typed-object.ts";

export interface EntityModelFactory {

  // TODO Implement method to create entity model from a package information?

  /**
   * Create model using Dataspecer API JSON response.
   *
   * @param payload
   * @param types
   */
  createFromApiJsonObject<T extends TypedObject>(payload: object, types: string[]): Promise<T | null>;

}

