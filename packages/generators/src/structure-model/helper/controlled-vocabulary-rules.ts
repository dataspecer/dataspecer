import { getControlledVocabularyRulesByQualifier, type ControlledVocabularyRule } from "../../conceptual-model/model/conceptual-model-controlled-vocabulary.ts";
import type { StructureModelClass } from "../model/structure-model-class.ts";

/**
 * For controlled vocabulary assignments with usage qualifier "recommended"
 * the user can select the strictness of the validation - is CV use mandatory and are other values allowed
 * Each rule is a rule of its own, a generator decides how the rules combine.
 */
export interface ControlledVocabularyRules {
  /**
   * Every value must satisfy the rule.
   */
  everyValue: ControlledVocabularyRule[];

  /**
   * At least one value must satisfy the rule.
   */
  atLeastOne: ControlledVocabularyRule[];
}

/**
 * Applies the qualifiers of the controlled vocabulary assignments of the class
 * to get the rules:
 * - "must" gives a rule for every value,
 * - "at-least-one" gives a rule for at least one value,
 * - "recommended" gives a rule for every value when the class restricts values
 *   to the recommended controlled vocabulary, and a rule for at least one value
 *   when the class requires a value from it,
 * - "may" gives nothing.
 * Assumes that the defaults of the data specification were applied to the
 * options of the class, an unset option counts as disabled.
 */
export function getControlledVocabularyRules(
  structureClass: Pick<StructureModelClass,
    "controlledVocabularies" | "requireRecommendedControlledVocabularyValue" | "restrictToRecommendedControlledVocabulary">,
): ControlledVocabularyRules {
  const rules = getControlledVocabularyRulesByQualifier(structureClass.controlledVocabularies ?? []);
  return {
    everyValue: [...rules.must, ...(structureClass.restrictToRecommendedControlledVocabulary === true ? rules.recommended : [])],
    atLeastOne: [...rules.atLeastOne, ...(structureClass.requireRecommendedControlledVocabularyValue === true ? rules.recommended : [])],
  };
}

/**
 * Rule with a pattern.
 */
export type ControlledVocabularyPatternRule = ControlledVocabularyRule & { pattern: string };

/**
 * Keeps the rules that have a pattern, each pattern once, for the generators that validate only the pattern of the IRI.
 * A rule that has only a concept scheme does not constrain the pattern.
 */
export function rulesWithPattern(rules: readonly ControlledVocabularyRule[]): ControlledVocabularyPatternRule[] {
  const result: ControlledVocabularyPatternRule[] = [];
  for (const rule of rules) {
    if (rule.pattern !== null && !result.some((existing) => existing.pattern === rule.pattern)) {
      result.push({ ...rule, pattern: rule.pattern });
    }
  }
  return result;
}
