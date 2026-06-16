import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import { deepEqual } from "@dataspecer/utilities";

export function diffEntities(previous: EntityRecord, next: EntityRecord): EntityChange[] {
  const prevIds = new Set(Object.keys(previous));
  const nextIds = new Set(Object.keys(next));
  const changes: EntityChange[] = [];

  for (const newEntityId of [...nextIds.difference(prevIds)]) {
    changes.push({
      previous: null,
      next: next[newEntityId],
    });
  }

  for (const commonEntityId of [...prevIds.intersection(nextIds)]) {
    const prevEntity = previous[commonEntityId];
    const nextEntity = next[commonEntityId];
    if (!deepEqual(prevEntity, nextEntity)) {
      changes.push({
        previous: prevEntity,
        next: nextEntity,
      });
    }
  }

  for (const deletedEntityId of [...prevIds.difference(nextIds)]) {
    changes.push({
      previous: previous[deletedEntityId],
      next: null,
    });
  }

  return changes;
};