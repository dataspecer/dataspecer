import { isRemoveEntityOperation, isSetEntityOperation, isUpdateEntityOperation } from "../operation/entity-operations.ts";
import type { Operation } from "../operation/operation.ts";
import { diffEntities } from "./diff.ts";
import type { EntityRecord } from "./entity.ts";
import type { EntityChange } from "./observable.ts";

/**
 * Applies the generic operations to any entity model and returns the net
 * changes. The entities are modified in place.
 */
export function applyOperationsToEntityModel(mutableModel: EntityRecord, operations: Operation[]): EntityChange[] {
  const previous = { ...mutableModel };
  for (const operation of operations) {
    if (isSetEntityOperation(operation)) {
      mutableModel[operation.entity.id] = operation.entity;
    } else if (isUpdateEntityOperation(operation)) {
      const entity = mutableModel[operation.update.id];
      if (entity) {
        mutableModel[operation.update.id] = { ...entity, ...operation.update };
      }
    } else if (isRemoveEntityOperation(operation)) {
      delete mutableModel[operation.entityId];
    } else {
      throw new Error("Unsupported operation: " + operation.type);
    }
  }
  return diffEntities(previous, mutableModel);
}
