
/**
 * @deprecated The `packages/entity-model` sources are deprecated.
 * Use the entity model implementation in `packages/core/src/entity-model` instead.
 * See: ../../../core/src/entity-model/index.ts
 */

/**
 * This type should be used whenever we identify an entity.
 */
/**
 * @deprecated Use `EntityIdentifier` from `packages/core/src/entity-model/entity.ts`.
 * See: ../../../core/src/entity-model/entity.ts
 */
export type EntityIdentifier = string;

/**
 * A JSON serializable object that represents an entity.
 *
 * @example Semantic class, relation, generalization, etc.
 */
/**
 * @deprecated Use `Entity` from `packages/core/src/entity-model/entity.ts`.
 * See: ../../../core/src/entity-model/entity.ts
 */
export interface Entity {

  /**
   * Globally unique identifier.
   */
  id: EntityIdentifier;

  type: string[];

}

/**
 * @deprecated Use `EntityArray` from `packages/core/src/entity-model/entity.ts`.
 * See: ../../../core/src/entity-model/entity.ts
 */
export type EntityList = Entity[];

/**
 * @deprecated Use `EntityRecord` from `packages/core/src/entity-model/entity.ts`.
 * See: ../../../core/src/entity-model/entity.ts
 */
export type EntityRecord = Record<string, Entity>;

/**
 * @deprecated Use `EntityMap` from `packages/core/src/entity-model/entity.ts`.
 * See: ../../../core/src/entity-model/entity.ts
 */
export type EntityMap = Map<string, Entity>;
