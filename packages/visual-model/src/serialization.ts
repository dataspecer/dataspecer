import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import { fixVisualEntityType, type VisualEntity } from "./concepts/visual-entity.ts";

/**
 * Takes serialization (JSON parsed data) and converts it to visual model entities.
 */
export function serializationToVisualModelEntities(data: unknown): Record<string, Entity> {
  const entities = (data as any).entities;
  const entityList = Object.values(entities) as VisualEntity[];
  const fixedEntityList = entityList.map(fixVisualEntityType);

  return Object.fromEntries(fixedEntityList.map(entity => [entity.id, entity]));
}

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