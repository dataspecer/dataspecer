import { describe, expect, it } from "vitest";
import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { ConceptualModelControlledVocabularyAssignment } from "../../conceptual-model/model/conceptual-model-controlled-vocabulary.ts";
import { getControlledVocabularyRules } from "./controlled-vocabulary-rules.ts";

function assignment(qualifier: Qualifier, pattern: string | null): ConceptualModelControlledVocabularyAssignment {
  return {
    id: `${qualifier}-${pattern}`,
    qualifier,
    vocabulary: { id: "vocabulary", iri: null, title: {}, pattern, references: "", conformsToSkos: true },
  };
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
      .toStrictEqual({ everyValue: ["^a$"], atLeastOne: ["^b$"] });
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
      .toStrictEqual({ everyValue: [], atLeastOne: ["^a$"] });
  });

  it("Makes 'recommended' a rule for every value when values are restricted.", () => {
    expect(rulesOf([assignment("recommended", "^a$")], false, true))
      .toStrictEqual({ everyValue: ["^a$"], atLeastOne: [] });
  });

  it("Applies both options of 'recommended' together.", () => {
    expect(rulesOf([assignment("recommended", "^a$")], true, true))
      .toStrictEqual({ everyValue: ["^a$"], atLeastOne: ["^a$"] });
  });

  it("Keeps a rule for each assignment.", () => {
    expect(rulesOf([assignment("must", "^a$"), assignment("must", "^b$")]))
      .toStrictEqual({ everyValue: ["^a$", "^b$"], atLeastOne: [] });
  });

  it("Ignores vocabularies without a pattern.", () => {
    expect(rulesOf([assignment("must", null), assignment("at-least-one", null)]))
      .toStrictEqual({ everyValue: [], atLeastOne: [] });
  });

});
