import { Entity } from "../entity-model/entity.ts";
import type { Entity as EntityFromCore } from "@dataspecer/core/entity-model";

/**
 * Base interface for all visual entities.
 */
export interface VisualEntity extends Entity { }

/**
 * Intersection type for entities that satisfy both the old visual entity
 * interface (with {@link Entity.identifier}) and the new core entity interface
 * (with {@link EntityFromCore.id}).
 *
 * Used during migration — once the visual model fully adopts the core Entity
 * interface this type can be collapsed.
 */
export type VisualEntityAndCoreEntity = VisualEntity & EntityFromCore;

/**
 * Convert a {@link VisualEntity} (old interface, uses {@link Entity.identifier})
 * to one that also satisfies the core {@link EntityFromCore} interface (uses `id`).
 *
 * Mirrors {@link coreResourceToEntity} from the core package.
 */
export function fixVisualEntityType<T extends VisualEntity | EntityFromCore>(entity: T): FixedVisualEntityType<T> {
  if ("id" in entity && "identifier" in entity && entity.id !== entity.identifier) {
    throw new Error("Entity has both 'id' and 'identifier' properties, but they are not equal.");
  }
  const id = (entity as EntityFromCore).id ?? (entity as VisualEntity).identifier;
  const result = {
    ...entity,
    id: id,
    identifier: id,
  };

  // @ts-expect-error TypeScript cannot infer that `result` satisfies both interfaces, but we know it does.
  return result;
}

export type FixedVisualEntityType<T extends VisualEntity | EntityFromCore> = T & VisualEntity & EntityFromCore;
