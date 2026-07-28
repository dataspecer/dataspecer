import { deepEqual } from "@dataspecer/utilities";
import type { Entity, EntityRecord } from "./entity.ts";
import type { EntityChange, EntityChangeCreated } from "./observable.ts";
import { createRemoveEntityOperation, createSetEntityOperation, createUpdateEntityOperation, type RemoveEntityOperation, type SetEntityOperation, type UpdateEntityOperation } from "../operation/entity-operations.ts";

/**
 * Diffs two entity records and returns the changes between them.
 */
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

/**
 * Takes a list of entity changes and converts it to a list of base operations
 * that would perform the same change.
 */
export function changesToEntityOperations(
  changes: EntityChange[],
): (SetEntityOperation | UpdateEntityOperation | RemoveEntityOperation)[] {
  // We need to maintain correct order of operations: creations first, then
  // updates, then deletions. But even in this case, the creations should be
  // ordered in such a way that if an entity A references entity B, then B
  // should be created before A.

  const creations = changes.filter((change) => change.previous === null) as EntityChangeCreated[];
  const updates = changes.filter((change) => change.previous !== null && change.next !== null);
  const deletions = changes.filter((change) => change.next === null);

  return [
    ...creations.map(change => createSetEntityOperation(change.next)),
    ...updates.map(change => createUpdateEntityOperation(
      {
        ...createPatch(change.previous, change.next),
        id: change.previous.id, // id is required for update operation
      }
    )),
    ...deletions.map(change => createRemoveEntityOperation(change.previous.id)),
  ]
}

/**
 * Creates a patch object so that `{...prev, ...patch}` would result
 * in `next`.
 */
export function createPatch<T extends Entity>(prev: T, next: T): Partial<T> {
  const patch: Partial<T> = {};

  for (const key in next) {
    if (!deepEqual(prev[key], next[key])) {
      patch[key] = next[key];
    }
  }

  for (const key in prev) {
    if (!(key in next)) {
      patch[key] = undefined as any;
    }
  }

  return patch;
}