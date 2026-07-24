import { expect, test } from "vitest";

import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import { createGeneralization, deleteEntity } from "@dataspecer/core-v2/semantic-model/operations";
import { createDefaultSemanticModelProfileOperationFactory } from "@dataspecer/core-v2/semantic-model/profile/operations";
import { diffEntities, type EntityRecord } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import { changesToProfileModelOperations } from "./diff.ts";

const factory = createDefaultSemanticModelProfileOperationFactory();

/**
 * Applies profile model operations (including the generalization and delete
 * operations shared with the semantic model) and returns the new state.
 */
function apply(entities: EntityRecord, operations: Operation[]): EntityRecord {
  const working = { ...entities };
  applyOperationsToSemanticModel(working, operations);
  return working;
}

test("diffing two states built by operations produces operations that transform one into the other", () => {
  const previous = apply({}, [
    factory.createClassProfile({ id: "p", iri: "p", name: { en: "P" }, profiling: ["a"] }),
    factory.createClassProfile({ id: "q", iri: "q", name: { en: "Q" }, profiling: ["b"] }),
    factory.createRelationshipProfile({
      id: "rp",
      ends: [{ concept: "p", profiling: [] }, { concept: "q", iri: "rp-end", name: { en: "rp" }, profiling: ["r"] }],
    }),
  ]);

  const next = apply(previous, [
    // Modified class profile.
    factory.modifyClassProfile("p", { name: { en: "P changed" }, usageNote: { en: "Note" } }),
    // Created class profile and generalization between profiles.
    factory.createClassProfile({ id: "s", iri: "s", name: { en: "S" }, profiling: ["a", "b"] }),
    createGeneralization({ id: "g", child: "s", parent: "p" }),
    // Deleted relationship profile.
    deleteEntity("rp"),
  ]);

  const changes = diffEntities(previous, next);
  const { operations, remainingChanges } = changesToProfileModelOperations(changes);

  // All entities are profiles (or generalizations), so nothing is left for
  // another layer.
  expect(remainingChanges).toEqual([]);

  const modifyOp = operations.find((operation) => "identifier" in operation && operation.identifier === "p");
  expect(modifyOp).toBeDefined();
  expect(modifyOp).toMatchObject({
    entity: {
      name: { en: "P changed" },
      usageNote: { en: "Note" },
    },
  });
  expect(modifyOp).not.toHaveProperty("entity.iri");
  expect(modifyOp).not.toHaveProperty("entity.profiling");
  expect(modifyOp).not.toHaveProperty("entity.id");
  expect(modifyOp).not.toHaveProperty("entity.type");

  expect(apply(previous, operations)).toEqual(next);
});
