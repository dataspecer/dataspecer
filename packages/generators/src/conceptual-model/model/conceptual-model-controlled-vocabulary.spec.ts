import { describe, expect, it } from "vitest";
import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  ConceptualModelControlledVocabularyAssignment,
  getControlledVocabularyPatterns,
} from "./conceptual-model-controlled-vocabulary.ts";

function assignment(id: string, qualifier: Qualifier, pattern: string | null): ConceptualModelControlledVocabularyAssignment {
  return {
    id,
    qualifier,
    vocabulary: { id: `${id}-vocabulary`, iri: null, title: {}, pattern, references: "", conformsToSkos: true },
  };
}

describe("getControlledVocabularyPatterns", () => {

  it("Sorts the patterns by the qualifiers of their assignments.", () => {
    expect(getControlledVocabularyPatterns([
      assignment("a", "must", "^a$"),
      assignment("b", "at-least-one", "^b$"),
      assignment("c", "recommended", "^c$"),
    ])).toStrictEqual({ must: ["^a$"], atLeastOne: ["^b$"], recommended: ["^c$"] });
  });

  it("Ignores the qualifier that expects nothing.", () => {
    expect(getControlledVocabularyPatterns([
      assignment("a", "may", "^a$"),
    ])).toStrictEqual({ must: [], atLeastOne: [], recommended: [] });
  });

  it("Ignores vocabularies without a pattern.", () => {
    expect(getControlledVocabularyPatterns([
      assignment("a", "must", null),
      assignment("b", "must", ""),
    ])).toStrictEqual({ must: [], atLeastOne: [], recommended: [] });
  });

  it("Lists a pattern once per qualifier.", () => {
    expect(getControlledVocabularyPatterns([
      assignment("a", "must", "^a$"),
      assignment("b", "recommended", "^a$"),
      assignment("c", "recommended", "^a$"),
    ])).toStrictEqual({ must: ["^a$"], atLeastOne: [], recommended: ["^a$"] });
  });

  it("Lists a pattern once.", () => {
    expect(getControlledVocabularyPatterns([
      assignment("a", "must", "^a$"),
      assignment("b", "must", "^a$"),
      assignment("c", "must", "^c$"),
    ])).toStrictEqual({ must: ["^a$", "^c$"], atLeastOne: [], recommended: [] });
  });

});
