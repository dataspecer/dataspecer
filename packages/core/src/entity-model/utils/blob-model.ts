import type { Entity, EntityRecord } from "../entity.ts";

/**
 * Creates entities from the blob model serialization. Since we do not know the
 * inner structure of the blob, we just create one entity with the whole blob as
 * its data.
 */
export function serializationToBlobModelEntities(id: string, data: object): EntityRecord {
  const entity: Entity = {
    ...data,
    id,
    type: [],
  };

  return { [entity.id]: entity };
}
