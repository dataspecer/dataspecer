import { describe, expect, it } from "vitest";
import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { ConceptualModelControlledVocabularyAssignment, ControlledVocabularyRule } from "../../conceptual-model/model/conceptual-model-controlled-vocabulary.ts";
import { getControlledVocabularyRules, rulesWithPattern } from "./controlled-vocabulary-rules.ts";

function assignment(qualifier: Qualifier, pattern: string | null, scheme: string | null = null): ConceptualModelControlledVocabularyAssignment {
  return {
    id: `${qualifier}-${pattern}`,
    qualifier,
    vocabulary: { id: `vocabulary-${pattern}`, iri: null, title: {}, pattern, references: scheme ?? "", conformsToSkos: scheme !== null },
  };
}

function rule(pattern: string, severity: "violation" | "warning", schemeIri: string | null = null): ControlledVocabularyRule {
  return { vocabularyId: `vocabulary-${pattern}`, pattern, schemeIri, severity };
}

function rulesOf(
  assignments: ConceptualModelControlledVocabularyAssignment[],
  require: boolean | null = null,
  restrict: boolean | null = null,
) {
  return getControlledVocabularyRules({
    controlledVocabularies: assignments,
    requireRecommendedControlledVocabularyValue: require,
    restrictToRecommendedControlledVocabulary: restrict,
  });
}

describe("getControlledVocabularyRules", () => {

  it("Makes 'must' a rule for every value and 'at-least-one' a rule for at least one value.", () => {
    expect(rulesOf([assignment("must", "^a$"), assignment("at-least-one", "^b$")]))
      .toStrictEqual({ everyValue: [rule("^a$", "violation")], atLeastOne: [rule("^b$", "warning")] });
  });

  it("Gives nothing for 'may'.", () => {
    expect(rulesOf([assignment("may", "^a$")], true, true))
      .toStrictEqual({ everyValue: [], atLeastOne: [] });
  });

  it("Gives nothing for 'recommended' while both options are disabled.", () => {
    expect(rulesOf([assignment("recommended", "^a$")]))
      .toStrictEqual({ everyValue: [], atLeastOne: [] });
    expect(rulesOf([assignment("recommended", "^a$")], false, false))
      .toStrictEqual({ everyValue: [], atLeastOne: [] });
  });

  it("Makes 'recommended' a rule for at least one value when a value is required.", () => {
    expect(rulesOf([assignment("recommended", "^a$")], true, false))
      .toStrictEqual({ everyValue: [], atLeastOne: [rule("^a$", "warning")] });
  });

  it("Makes 'recommended' a rule for every value when values are restricted.", () => {
    expect(rulesOf([assignment("recommended", "^a$")], false, true))
      .toStrictEqual({ everyValue: [rule("^a$", "warning")], atLeastOne: [] });
  });

  it("Applies both options of 'recommended' together.", () => {
    expect(rulesOf([assignment("recommended", "^a$")], true, true))
      .toStrictEqual({ everyValue: [rule("^a$", "warning")], atLeastOne: [rule("^a$", "warning")] });
  });

  it("Keeps a rule for each assignment.", () => {
    expect(rulesOf([assignment("must", "^a$"), assignment("must", "^b$")]))
      .toStrictEqual({ everyValue: [rule("^a$", "violation"), rule("^b$", "violation")], atLeastOne: [] });
  });

  it("Ignores vocabularies without a pattern and a scheme.", () => {
    expect(rulesOf([assignment("must", null), assignment("at-least-one", null)]))
      .toStrictEqual({ everyValue: [], atLeastOne: [] });
  });

  it("Keeps the scheme with the pattern, and a scheme without a pattern.", () => {
    expect(rulesOf([assignment("must", "^a$", "http://example.com/a"), assignment("must", null, "http://example.com/b")]).everyValue)
      .toStrictEqual([
        rule("^a$", "violation", "http://example.com/a"),
        { vocabularyId: "vocabulary-null", pattern: null, schemeIri: "http://example.com/b", severity: "violation" },
      ]);
  });

});

describe("rulesWithPattern", () => {

  it("Drops rules without a pattern.", () => {
    expect(rulesWithPattern([
      rule("^a$", "violation"),
      { vocabularyId: "v", pattern: null, schemeIri: "http://example.com/b", severity: "violation" },
    ])).toStrictEqual([rule("^a$", "violation")]);
  });

  it("Lists a pattern once, the first rule wins.", () => {
    expect(rulesWithPattern([
      rule("^a$", "violation", "http://example.com/a"),
      rule("^a$", "warning", "http://example.com/b"),
    ])).toStrictEqual([rule("^a$", "violation", "http://example.com/a")]);
  });

});
