import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import { type VisualEntity } from "./concepts/visual-entity.ts";

/**
 * Takes serialization (JSON parsed data) and converts it to visual model entities.
 */
export function serializationToVisualModelEntities(data: unknown): Record<string, Entity> {
  if (!data) {
    return {};
  }
  const entities = (data as any).entities;
  // We need to fix entities when deserializing.
  const entityList = (Object.values(entities) as VisualEntity[]).map(fixVisualEntity);
  return Object.fromEntries(entityList.map(entity => [entity.id, entity]));
}

function fixVisualEntity(entity: any) {

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

/**
 * Given serialization produced by {@link serializationToVisualModelEntities}
 * produces back list of entities
 */
export function visualModelEntitiesToSerialization(entities: EntityRecord): unknown {
  const entityList = Object.values(entities) as Entity[];
  return {
    identifier: "todo",
    version: 2,
    type: "http://dataspecer.com/resources/local/visual-model",
    entities: Object.fromEntries(entityList.map(entity => [entity.id, entity])),
  };
}

