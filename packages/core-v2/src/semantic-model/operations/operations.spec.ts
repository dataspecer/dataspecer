import { diffEntities, type EntityRecord } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import { applyOperationsToSemanticModel } from "../apply-operations.ts";
import { changesToSemanticModelOperations } from "./diff.ts";
import { createClass, createGeneralization, createRelationship, deleteEntity, isModifyRelationEndOperation, modifyClass, modifyRelationEnd } from "./operations.ts";
import { expect, test } from "vitest";

/**
 * Applies semantic model operations and returns the new state.
 */
function apply(entities: EntityRecord, operations: Operation[]): EntityRecord {
  const working = { ...entities };
  applyOperationsToSemanticModel(working, operations);
  return working;
}

test("diffing two states built by operations produces operations that transform one into the other", () => {
  const previous = apply({}, [
    createClass({ id: "a", iri: "a", name: { en: "A" } }),
    createClass({ id: "b", iri: "b", name: { en: "B" } }),
    createRelationship({
      id: "r",
      ends: [{ concept: "a" }, { concept: "b", iri: "r-end", name: { en: "r" } }],
    }),
  ]);

  const next = apply(previous, [
    // Modified class.
    modifyClass("a", { name: { en: "A changed" }, description: { en: "New description" } }),
    // Created class and generalization.
    createClass({ id: "c", iri: "c", name: { en: "C" } }),
    createGeneralization({ id: "g", child: "c", parent: "a" }),
    // Deleted relationship.
    deleteEntity("r"),
  ]);

  const changes = diffEntities(previous, next);
  const { operations, remainingChanges } = changesToSemanticModelOperations(changes);

  // All entities are semantic, so nothing is left for another layer.
  expect(remainingChanges).toEqual([]);

  expect(apply(previous, operations)).toEqual(next);
});

test("diffing a single relationship end change produces a modify-relation-end operation", () => {
  const previous = apply({}, [
    createClass({ id: "a", iri: "a", name: { en: "A" } }),
    createClass({ id: "b", iri: "b", name: { en: "B" } }),
    createRelationship({
      id: "r",
      ends: [
        { concept: "a", name: { en: "left" } },
        { concept: "b", name: { en: "right" } },
      ],
    }),
  ]);

  const next = apply(previous, [
    modifyRelationEnd("r", 1, { name: { en: "right changed" } }),
  ]);

  const changes = diffEntities(previous, next);
  const { operations, remainingChanges } = changesToSemanticModelOperations(changes);

  expect(remainingChanges).toEqual([]);
  expect(operations).toHaveLength(1);
  expect(isModifyRelationEndOperation(operations[0]!)).toBe(true);
  expect(apply(previous, operations)).toEqual(next);
});
