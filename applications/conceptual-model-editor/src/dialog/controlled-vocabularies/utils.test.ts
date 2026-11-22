import { describe, expect, test } from "vitest";
import { countMissingControlledVocabularies } from "./utils";

function assignment(id: string, vocabulary: string) {
  return {
    rawEntity: {
      id,
      type: ["controlled-vocabulary-assignment"],
      classProfile: "profile",
      vocabulary,
      qualifier: "may",
      replaces: null,
      iri: null,
    },
  };
}

describe("countMissingControlledVocabularies", () => {

  const entities = {
    "a-1": assignment("a-1", "cv-existing"),
    "a-2": assignment("a-2", "cv-deleted"),
    "a-3": assignment("a-3", "cv-deleted-too"),
  } as Parameters<typeof countMissingControlledVocabularies>[1];

  test("Counts only assignments with an unavailable vocabulary.", () => {
    const result = countMissingControlledVocabularies(
      ["a-1", "a-2", "a-3"], entities, new Set(["cv-existing"]));
    expect(result).toBe(2);
  });

  test("Reports nothing while vocabularies are loading.", () => {
    expect(countMissingControlledVocabularies(["a-2"], entities, null)).toBe(0);
  });

  test("Ignores identifiers that are not assignments.", () => {
    expect(countMissingControlledVocabularies(["unknown"], entities, new Set())).toBe(0);
  });

  test("Handles a profile without assignments.", () => {
    expect(countMissingControlledVocabularies(undefined, entities, new Set())).toBe(0);
  });

});
