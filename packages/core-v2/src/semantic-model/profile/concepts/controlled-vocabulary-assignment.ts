import { Entity } from "@dataspecer/core/entity-model";
import { EntityIdentifier } from "../../../entity-model/entity.ts";

/**
 * Qualifier for expected usage of controlled vocabularies, when assigned to a class profile.
 * Qualifier is based on how DCAT-AP 3 specification describes possible controlled vocabulary usage.
 * Ordered from the strictest to the most permissive:
 * - must: values must come from the vocabulary
 * - at-least-one: at least one value must come from the vocabulary
 * - recommended: values should come from the vocabulary
 * - may: values may come from the vocabulary
 */
export type Qualifier = "must" | "at-least-one" | "recommended" | "may";

/**
 * Assignments stored before the qualifiers became lowercase hold the
 * original uppercase values.
 */
const LEGACY_QUALIFIERS: Record<string, Qualifier> = {
  "MUST": "must",
  "AT_LEAST_1": "at-least-one",
  "RECOMMENDED": "recommended",
  "MAY": "may",
};

/**
 * @returns The current qualifier for a legacy uppercase one, otherwise the
 * value as it is.
 */
export function normalizeQualifier(value: string): string {
  return LEGACY_QUALIFIERS[value] ?? value;
}

/**
 * Represents a reference to a local controlled vocabulary assignment
 * where the assignment is an entity local to this package,
 * so it can be referenced by an EntityIdentifier
 */
export type LocalControlledVocabylaryAssignmentRefenence = { kind: "local", target: EntityIdentifier };

/**
 * Represents a reference to an imported controlled vocabulary assignment
 * - used when the target came from an imported DSV document
 *  rather than from the local package entity
 * - the IRI is stored verbatim and never resolved locally
 */
export type ImportedControlledVocabylaryAssignmentRefenence = { kind: "imported", iri: string };

/**
 * Reference to a controlled vocabulary assignment 
 * when it is being replaced by a different assignment
 * {@link LocalControlledVocabylaryAssignmentRefenence} targets another assignment entity in this package
 * {@link ImportedControlledVocabylaryAssignmentRefenence} targets an imported assignment
 */
export type ControlledVocabularyAssignmentReplaces = LocalControlledVocabylaryAssignmentRefenence | ImportedControlledVocabylaryAssignmentRefenence;


/**
 * Represents assigning a controlled vocabulary to a class profile,
 * meaning that values of class profile should be instances of the controlled vocabulary, depending on the usage qualifier.
 * There can be multiple assignments of different vocabularies per profile.
 * An assignment references exactly one controlled vocabulary.
 * Having this as an entity separate from class profile allows to reference the specific CV assignment 
 * when it is replaced further in the profile hierarchy.
 */
export interface ControlledVocabularyAssignment extends Entity {

  type: [typeof CONTROLLED_VOCABULARY_ASSIGNMENT];

  /**
   * Owning class profile.
   */
  classProfile: EntityIdentifier;

  /**
   * Reference to the controlled vocabulary entity being assigned.
   * Each ControlledVocabulary entity is saved on BE inside a separate model
   * of type CONTROLLED_VOCABULARY_MODEL. 
   * The model has the same ID as the one ControlledVocabulary entity it contains.
   */
  vocabulary: EntityIdentifier;

  /**
   * Expected usage of the controlled vocabulary 
   * in the context of the class profile it was assigned to
   */
  qualifier: Qualifier;

  /**
   * Non-null when this assignment overrides an inherited assignment higher in the profile hierarchy.
   * null means "no override" - no replacement
   */
  replaces: ControlledVocabularyAssignmentReplaces | null;

  /**
   * Stored/imported IRI, or null to generate one deterministically on
   * DSV export. Editing this assignment's vocabulary or qualifier
   * through the CME should reset this to null, since at that point it
   * is a locally-authored assignment rather than a pass-through import.
   */
  iri: string | null;

}

export const CONTROLLED_VOCABULARY_ASSIGNMENT = "controlled-vocabulary-assignment";

export function isControlledVocabularyAssignment(
  entity: Entity | null,
): entity is ControlledVocabularyAssignment {
  return entity?.type.includes(CONTROLLED_VOCABULARY_ASSIGNMENT) ?? false;
}

/**
 * @returns The entity with a legacy qualifier replaced, see
 * {@link normalizeQualifier}. Anything that is not a controlled vocabulary
 * assignment with a legacy qualifier is returned as it is.
 */
export function normalizeLegacyAssignment(entity: Entity): Entity {
  if (!isControlledVocabularyAssignment(entity)) {
    return entity;
  }
  const qualifier = normalizeQualifier(entity.qualifier);
  return qualifier === entity.qualifier ? entity : { ...entity, qualifier } as Entity;
}
