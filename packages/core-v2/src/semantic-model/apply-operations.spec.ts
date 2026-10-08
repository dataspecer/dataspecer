import { describe, expect, test } from "vitest";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { createSetEntityOperation, createUpdateEntityOperation } from "@dataspecer/core/operation";

import { applyOperationsToSemanticModel } from "./apply-operations.ts";
import {
  CONTROLLED_VOCABULARY_ASSIGNMENT,
  type ControlledVocabularyAssignment,
} from "./profile/concepts/index.ts";

function assignment(qualifier: string): ControlledVocabularyAssignment {
  return {
    id: "assignment",
    type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
    classProfile: "class-profile",
    vocabulary: "vocabulary",
    qualifier,
    replaces: null,
    iri: null,
  } as ControlledVocabularyAssignment;
}

describe("applyOperationsToSemanticModel - legacy qualifiers", () => {

  test("A recorded set operation with a legacy qualifier results in the current qualifier.", () => {

    const entities: EntityRecord = {};

    applyOperationsToSemanticModel(entities, [
      createSetEntityOperation(assignment("AT_LEAST_1")),
    ]);

    expect((entities["assignment"] as ControlledVocabularyAssignment).qualifier)
      .toBe("at-least-one");

  });

  test("A recorded update operation with a legacy qualifier results in the current qualifier.", () => {

    const entities: EntityRecord = { assignment: assignment("may") };

    const { updated } = applyOperationsToSemanticModel(entities, [
      createUpdateEntityOperation("assignment", { qualifier: "MUST" }),
    ]);

    expect((entities["assignment"] as ControlledVocabularyAssignment).qualifier)
      .toBe("must");
    expect((updated["assignment"] as ControlledVocabularyAssignment).qualifier)
      .toBe("must");

  });

  test("Current qualifiers and other entities are written as they are.", () => {

    const entities: EntityRecord = {};
    const other = { id: "other", type: ["other"], qualifier: "MUST" };
    const current = assignment("recommended");

    applyOperationsToSemanticModel(entities, [
      createSetEntityOperation(other),
      createSetEntityOperation(current),
    ]);

    expect(entities["other"]).toBe(other);
    expect(entities["assignment"]).toBe(current);

  });

});
