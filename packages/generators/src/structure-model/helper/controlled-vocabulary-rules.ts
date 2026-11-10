import { getControlledVocabularyPatterns } from "../../conceptual-model/model/conceptual-model-controlled-vocabulary.ts";
import type { StructureModelClass } from "../model/structure-model-class.ts";

/**
 * Patterns of the IRIs of values of a class that its controlled vocabulary
 * assignments and the options for the usage "recommended" make mandatory.
 * Each pattern is a rule of its own, a generator decides how the rules combine.
 */
export interface ControlledVocabularyRules {
  /**
   * Every value must match the pattern.
   */
  everyValue: string[];

  /**
   * At least one value must match the pattern.
   */
  atLeastOne: string[];
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
  const patterns = getControlledVocabularyPatterns(structureClass.controlledVocabularies ?? []);
  return {
    everyValue: [...patterns.must, ...(structureClass.restrictToRecommendedControlledVocabulary === true ? patterns.recommended : [])],
    atLeastOne: [...patterns.atLeastOne, ...(structureClass.requireRecommendedControlledVocabularyValue === true ? patterns.recommended : [])],
  };
}
