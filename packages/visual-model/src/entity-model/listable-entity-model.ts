import { Entity } from "./entity.ts";

export interface ListableEntityModel {

  /**
   * Return entities from given offset to given limit.
   * @param cursor Entity identifier, this is the last entity not returned.
   * @param limit Number of entities to return or undefined to return all.
   */
  getEntities(cursor?: string, limit?: number): Promise<{

    entities: Entity[];

    /**
     * True when there is no more entities to return.
     */
    isLast: boolean;

  }>;

  /**
   * @returns Identifiers for all stored entities.
   */
  getEntityIdentifiers(): Promise<string[]>;

}

export function isListableEntityModel(what: unknown): what is ListableEntityModel {

  return typeof what === "object" && what !== null && "getEntities" in what;

}
