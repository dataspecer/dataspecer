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
 * Severity of a controlled vocabulary rule violation.
 * Only the qualifier "must" is a violation, the others are warnings, as in DCAT-AP.
 */
export type ControlledVocabularySeverity = "violation" | "warning";

/**
 * Metadata relevant for controlled vocabulary pattern validation
 * A generator decides which of the information it can express,
 * for example pattern validation does not use the scheme or the severity.
 */
export interface ControlledVocabularyRule {
  /**
   * Id of the controlled vocabulary that defines the rule.
   * When several vocabularies define the same rule, it is the first of them (unlikely in practice).
   */
  vocabularyId: string;

  /**
   * Regular expression that the IRI of the value must match, null if the vocabulary has none.
   */
  pattern: string | null;

  /**
   * IRI of the skos:ConceptScheme the value must belong to,
   * null if the vocabulary does not conform to SKOS.
   */
  schemeIri: string | null;

  severity: ControlledVocabularySeverity;
}

/**
 * Rules of the controlled vocabulary assignments of a class profile,
 * sorted by the qualifier of the assignment.
 * Each rule is a rule of its own, a generator decides how the rules combine.
 */
export interface ControlledVocabularyRulesByQualifier {
  /**
   * Every value must satisfy the rule.
   */
  must: ControlledVocabularyRule[];

  /**
   * At least one value must satisfy the rule.
   */
  atLeastOne: ControlledVocabularyRule[];

  /**
   * Values should satisfy the rule. Whether a generator enforces it is up to
   * its configuration.
   */
  recommended: ControlledVocabularyRule[];
}

/**
 * Collects the rules of the assignments by their qualifiers.
 * Qualifier "may" does not validate anything, so it is not included.
 * Vocabularies with neither a pattern nor a scheme do not constrain anything either.
 * Each combination of a pattern and a scheme is listed once per qualifier to avoid duplicate rules in docs.
 */
export function getControlledVocabularyRulesByQualifier(
  assignments: readonly ConceptualModelControlledVocabularyAssignment[],
): ControlledVocabularyRulesByQualifier {
  const result: ControlledVocabularyRulesByQualifier = { must: [], atLeastOne: [], recommended: [] };
  for (const { qualifier, vocabulary } of assignments) {
    const pattern = vocabulary.pattern === null || vocabulary.pattern === "" ? null : vocabulary.pattern;
    const schemeIri = vocabulary.conformsToSkos && vocabulary.references ? vocabulary.references : null;
    if (pattern === null && schemeIri === null) {
      continue;
    }
    const target = qualifier === "must" ? result.must
      : qualifier === "at-least-one" ? result.atLeastOne
        : qualifier === "recommended" ? result.recommended
          : null;
    if (target !== null && !target.some((existing) => existing.pattern === pattern && existing.schemeIri === schemeIri)) {
      target.push({
        vocabularyId: vocabulary.id,
        pattern,
        schemeIri,
        severity: qualifier === "must" ? "violation" : "warning",
      });
    }
  }
  return result;
}
