/**
 * Identifier is unique in scope of a model.
 */
export type EntityIdentifier = string;

/**
 * Base interface for an entity.
 */
export interface Entity {

  /**
   * Entity identifier.
   * @deprecated Use `id` instead on Entity from `@dataspecer/core`.
   */
  identifier: EntityIdentifier;

  /**
   * Entity types.
   * Use this to determine actual type.
   */
  type: string[];

}