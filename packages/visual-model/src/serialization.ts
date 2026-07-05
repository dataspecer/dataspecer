import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import { type VisualEntity } from "./concepts/visual-entity.ts";

/**
 * Takes serialization (JSON parsed data) and converts it to visual model entities.
 */
export function serializationToVisualModelEntities(data: unknown): Record<string, Entity> {
  const entities = (data as any).entities;
  const entityList = Object.values(entities) as VisualEntity[];
  return Object.fromEntries(entityList.map(entity => [entity.id, entity]));
}

/**
 * Given serialization produced by {@link serializationToVisualModelEntities}
 * produces back list of entities
 */
export function visualModelEntitiesToSerialization(entities: EntityRecord): unknown {
  const entityList = Object.values(entities) as Entity[];
  const visualEntityList = entityList.map(fixVisualEntityType);
  return {
    identifier: "todo",
    version: 1,
    type: "http://dataspecer.com/resources/local/visual-model",
    entities: Object.fromEntries(visualEntityList.map(entity => [entity.id, entity])),
  };
}

function fixVisualEntityType(entity: any) {

  // First we check for required state.
  if ("id" in entity) {
    return entity;
  }

  // Next we go with the one we can migrate.
  if ("identifier" in entity) {
    const next = {...entity};
    next["id"] = next["identifier"];
    delete next["identifier"];
    return next;
  }

  // Just pass as we do not know what to do.
  return entity;
}
