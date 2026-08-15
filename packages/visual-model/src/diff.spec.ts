import { expect, test } from "vitest";

import { diffEntities, type EntityRecord } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import { changesToVisualModelOperations } from "./diff.ts";
import { applyOperationsToVisualModel } from "./executor/executor.ts";
import {
  createAddVisualGroupOperation, createAddVisualNodeOperation,
  createAddVisualRelationshipOperation, createDeleteModelColorOperation,
  createDeleteVisualEntityOperation, createSetLabelOperation,
  createSetModelColorOperation, createSetViewOperation,
  createUpdateVisualEntityOperation,
} from "./operations.ts";

/**
 * Applies visual model operations and returns the new state.
 */
function apply(entities: EntityRecord, operations: Operation[]): EntityRecord {
  const working = { ...entities };
  applyOperationsToVisualModel(working, operations);
  return working;
}

test("diffing two states built by operations produces operations that transform one into the other", () => {
  const previous = apply({}, [
    createAddVisualNodeOperation({
      id: "n1", representedEntity: "e1", model: "m1",
      position: { x: 0, y: 0, anchored: null }, content: [], visualModels: [],
    }),
    createAddVisualNodeOperation({
      id: "n2", representedEntity: "e2", model: "m1",
      position: { x: 10, y: 10, anchored: null }, content: [], visualModels: [],
    }),
    createAddVisualRelationshipOperation({
      id: "r1", representedRelationship: "re1", model: "m1",
      waypoints: [], visualSource: "n1", visualTarget: "n2",
    }),
    createSetModelColorOperation("m1", "#ff0000"),
    createSetLabelOperation({ en: "Label" }),
    createSetViewOperation({ initialPositions: { x: 1, y: 2 } }),
  ]);

  const next = apply(previous, [
    // Updated node.
    createUpdateVisualEntityOperation("n1", { content: ["attr-1"] }),
    // Created group referencing existing nodes.
    createAddVisualGroupOperation({ id: "g1", anchored: null, content: ["n1", "n2"] }),
    // Deleted relationship.
    createDeleteVisualEntityOperation("r1"),
    // Changed model color.
    createSetModelColorOperation("m1", "#00ff00"),
    // Changed label.
    createSetLabelOperation({ en: "Label changed" }),
  ]);

  const changes = diffEntities(previous, next);
  const { operations, remainingChanges } = changesToVisualModelOperations(changes);

  // All entities are visual entities, so nothing is left for another layer.
  expect(remainingChanges).toEqual([]);

  expect(apply(previous, operations)).toEqual(next);
});

test("deleting a model color entity produces a delete-model-color operation", () => {
  const previous = apply({}, [createSetModelColorOperation("m1", "#ff0000")]);
  const next = apply(previous, [createDeleteModelColorOperation("m1")]);

  const changes = diffEntities(previous, next);
  const { operations, remainingChanges } = changesToVisualModelOperations(changes);

  expect(remainingChanges).toEqual([]);
  expect(apply(previous, operations)).toEqual(next);
});
