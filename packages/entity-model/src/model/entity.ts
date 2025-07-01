import { EntityIdentifier } from "./identifier.ts";

/**
 * A JSON serializable object that represents an entity.
 *
 * @example Semantic class, relation, generalization, etc.
 */
export interface Entity {

  /**
   * Globally unique identifier.
   */
  id: EntityIdentifier;

  type: string[];

}

export type EntityList = Entity[];

export type EntityRecord = Record<string, Entity>;

export type EntityMap = Map<string, Entity>;
