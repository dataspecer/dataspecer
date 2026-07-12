import { isRemoveEntityOperation, isSetEntityOperation, isUpdateEntityOperation } from "../operation/entity-operations.ts";
import type { Operation } from "../operation/operation.ts";
import { diffEntities } from "./diff.ts";
import type { EntityRecord } from "./entity.ts";
import type { EntityChange } from "./observable.ts";

/**
 * Applies the generic operations to any entity model and returns the net
 * changes. The entities are modified in place.
 */
export function applyOperationsToEntityModel(entities: EntityRecord, operations: Operation[]): EntityChange[] {
  const previous = { ...entities };
  for (const operation of operations) {
    if (isSetEntityOperation(operation)) {
      entities[operation.entity.id] = operation.entity;
    } else if (isUpdateEntityOperation(operation)) {
      const entity = entities[operation.update.id];
      if (entity) {
        entities[operation.update.id] = { ...entity, ...operation.update };
      }
    } else if (isRemoveEntityOperation(operation)) {
      delete entities[operation.entityId];
    } else {
      throw new Error("Unsupported operation: " + operation.type);
    }
  }
  return diffEntities(previous, entities);
}
