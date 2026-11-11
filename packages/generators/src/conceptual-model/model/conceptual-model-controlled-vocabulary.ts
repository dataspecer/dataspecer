import type { LanguageString } from "@dataspecer/core/core";
import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";

/**
 * Controlled vocabulary as the generators need it.
 * It is plain data only, so the models stay serializable.
 */
export interface ConceptualModelControlledVocabulary {
  id: string;

  iri: string | null;

  title: LanguageString;

  /**
   * Regular expression of the IRIs of the vocabulary values, null if not known.
   */
  pattern: string | null;

  /**
   * IRI of the skos:ConceptScheme when {@link conformsToSkos} is true,
   * otherwise the download or documentation URL.
   */
  references: string;

  conformsToSkos: boolean;
}

/**
 * Controlled vocabulary assigned to a class profile together with the expected
 * usage of the vocabulary.
 */
export interface ConceptualModelControlledVocabularyAssignment {
  id: string;

  qualifier: Qualifier;

  vocabulary: ConceptualModelControlledVocabulary;
}

/**
 * Metadata relevant for controlled vocabulary pattern validation
 */
export interface ControlledVocabularyPattern {
  pattern: string;

  /**
   * Id of the controlled vocabulary that defines the pattern.
   * When several vocabularies have the same pattern, it is the first of the (unlikelly in practice)
   */
  vocabularyId: string;
}

/**
 * Patterns of the IRIs of values that a class profile with the given
 * controlled vocabulary assignments expects, sorted by the qualifier of the
 * assignment. Each pattern is a rule of its own, a generator decides how the
 * rules combine.
 */
export interface ControlledVocabularyPatterns {
  /**
   * Every value must match the pattern.
   */
  must: ControlledVocabularyPattern[];

  /**
   * At least one value must match the pattern.
   */
  atLeastOne: ControlledVocabularyPattern[];

  /**
   * Values should match the pattern. Whether a generator enforces it is up to
   * its configuration.
   */
  recommended: ControlledVocabularyPattern[];
}

/**
 * Collects the patterns of the assignments by their qualifiers.
 * Qualifier "may" does not validate anything, so it is not included.
 * Vocabularies without a pattern do not constrain anything either.
 * Each pattern is listed once per qualifier to avoid duplicate regexes in docs.
 */
export function getControlledVocabularyPatterns(
  assignments: readonly ConceptualModelControlledVocabularyAssignment[],
): ControlledVocabularyPatterns {
  const result: ControlledVocabularyPatterns = { must: [], atLeastOne: [], recommended: [] };
  for (const { qualifier, vocabulary } of assignments) {
    const pattern = vocabulary.pattern;
    if (pattern === null || pattern === "") {
      continue;
    }
    const target = qualifier === "must" ? result.must
      : qualifier === "at-least-one" ? result.atLeastOne
        : qualifier === "recommended" ? result.recommended
          : null;
    if (target !== null && !target.some((existing) => existing.pattern === pattern)) {
      target.push({ pattern, vocabularyId: vocabulary.id });
    }
  }
  return result;
}
