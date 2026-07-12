import { createRemoveEntityOperation, createSetEntityOperation, createUpdateEntityOperation } from "../operation/entity-operations.ts";
import { applyOperationsToEntityModel } from "./apply-operations.ts";
import { changesToEntityOperations, diffEntities } from "./diff.ts";
import type { Entity, EntityRecord } from "./entity.ts";

test("diffing two states produces operations that transform one into the other", () => {
  const previous: EntityRecord = {};
  applyOperationsToEntityModel(previous, [
    createSetEntityOperation({ id: "a", type: [], value: 1 } as Entity),
    createSetEntityOperation({ id: "b", type: [], value: 2 } as Entity),
  ]);

  const next = { ...previous };
  applyOperationsToEntityModel(next, [
    // Modified entity.
    createUpdateEntityOperation({ id: "a", value: 42, addedKey: "x" } as Partial<Entity> & { id: string }),
    // Created entity.
    createSetEntityOperation({ id: "c", type: [], value: 3 } as Entity),
    // Deleted entity.
    createRemoveEntityOperation("b"),
  ]);

  const operations = changesToEntityOperations(diffEntities(previous, next));

  applyOperationsToEntityModel(previous, operations);
  expect(previous).toEqual(next);
});
