import { describe, expect, it } from "vitest";
import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  ConceptualModelControlledVocabularyAssignment,
  getControlledVocabularyRulesByQualifier,
} from "./conceptual-model-controlled-vocabulary.ts";

function assignment(
  id: string,
  qualifier: Qualifier,
  pattern: string | null,
  scheme: string | null = null,
  conformsToSkos = scheme !== null,
): ConceptualModelControlledVocabularyAssignment {
  return {
    id,
    qualifier,
    vocabulary: { id: `${id}-vocabulary`, iri: null, title: {}, pattern, references: scheme ?? "", conformsToSkos },
  };
}

describe("getControlledVocabularyRulesByQualifier", () => {

  it("Sorts the rules by the qualifiers of their assignments.", () => {
    expect(getControlledVocabularyRulesByQualifier([
      assignment("a", "must", "^a$"),
      assignment("b", "at-least-one", "^b$"),
      assignment("c", "recommended", "^c$"),
    ])).toStrictEqual({
      must: [{ vocabularyId: "a-vocabulary", pattern: "^a$", schemeIri: null, severity: "violation" }],
      atLeastOne: [{ vocabularyId: "b-vocabulary", pattern: "^b$", schemeIri: null, severity: "warning" }],
      recommended: [{ vocabularyId: "c-vocabulary", pattern: "^c$", schemeIri: null, severity: "warning" }],
    });
  });

  it("Ignores the qualifier that expects nothing.", () => {
    expect(getControlledVocabularyRulesByQualifier([
      assignment("a", "may", "^a$", "http://example.com/a"),
    ])).toStrictEqual({ must: [], atLeastOne: [], recommended: [] });
  });

  it("Ignores vocabularies without a pattern and a scheme.", () => {
    expect(getControlledVocabularyRulesByQualifier([
      assignment("a", "must", null),
      assignment("b", "must", ""),
      assignment("c", "must", "^c$", "http://example.com/c", false),
    ]).must.map(rule => rule.vocabularyId)).toStrictEqual(["c-vocabulary"]);
  });

  it("Keeps the pattern and the scheme of a vocabulary in one rule.", () => {
    expect(getControlledVocabularyRulesByQualifier([
      assignment("a", "must", "^a$", "http://example.com/a"),
    ]).must).toStrictEqual([
      { vocabularyId: "a-vocabulary", pattern: "^a$", schemeIri: "http://example.com/a", severity: "violation" },
    ]);
  });

  it("Keeps a vocabulary that has a scheme but no pattern.", () => {
    expect(getControlledVocabularyRulesByQualifier([
      assignment("a", "must", null, "http://example.com/a"),
    ]).must).toStrictEqual([
      { vocabularyId: "a-vocabulary", pattern: null, schemeIri: "http://example.com/a", severity: "violation" },
    ]);
  });

  it("Has no scheme for a vocabulary that does not conform to SKOS.", () => {
    expect(getControlledVocabularyRulesByQualifier([
      assignment("a", "must", "^a$", "http://example.com/a", false),
    ]).must.map(rule => rule.schemeIri)).toStrictEqual([null]);
  });

  it("Lists a rule once per qualifier.", () => {
    expect(getControlledVocabularyRulesByQualifier([
      assignment("a", "must", "^a$"),
      assignment("b", "recommended", "^a$"),
      assignment("c", "recommended", "^a$"),
    ])).toStrictEqual({
      must: [{ vocabularyId: "a-vocabulary", pattern: "^a$", schemeIri: null, severity: "violation" }],
      atLeastOne: [],
      recommended: [{ vocabularyId: "b-vocabulary", pattern: "^a$", schemeIri: null, severity: "warning" }],
    });
  });

  it("Lists the same pattern again when the scheme differs.", () => {
    expect(getControlledVocabularyRulesByQualifier([
      assignment("a", "must", "^a$", "http://example.com/a"),
      assignment("b", "must", "^a$", "http://example.com/b"),
    ]).must).toHaveLength(2);
  });

  it("Names the first vocabulary when several have the same rule.", () => {
    expect(getControlledVocabularyRulesByQualifier([
      assignment("a", "must", "^a$"),
      assignment("b", "must", "^a$"),
      assignment("c", "must", "^c$"),
    ]).must.map(rule => rule.vocabularyId)).toStrictEqual(["a-vocabulary", "c-vocabulary"]);
  });

});
