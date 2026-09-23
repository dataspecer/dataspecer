import { Entity } from "@dataspecer/core/entity-model";
import { EntityIdentifier } from "../../../entity-model/entity.ts";

export type Qualifier = "MUST" | "AT_LEAST_1" | "RECOMMENDED" | "MAY";

/**
 * Represents a reference to a local controlled vocabulary assignment
 * where the assignment is an entity local to this package,
 * so it can be referenced by an EntityIdentifier
 */
export type CVAssignmentReferenceLocal = { kind: "local", target: EntityIdentifier };

/**
 * Represents a reference to an imported controlled vocabulary assignment
 * - used when the target came from an imported DSV document
 *  rather than from the local package entity
 * - the IRI is stored verbatim and never resolved locally
 */
export type CVAssignmentReferenceImported = { kind: "imported", iri: string };

/**
 * Reference to a controlled vocabulary assignment 
 * when it is being replaced by a different assignment
 * {@link CVAssignmentReferenceLocal} targets another assignment entity in this package
 * {@link CVAssignmentReferenceImported} targets an imported assignment
 */
export type ControlledVocabularyAssignmentReplaces = CVAssignmentReferenceLocal | CVAssignmentReferenceImported;


/**
 * Represents assigning a controlled vocabulary to a class profile,
 * meaning that values of class profile should be instances of the controlled vocabulary, depending on the usage qualifier.
 * There can be multiple assignments of different vocabularies per profile.
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
   * Id of the vocabulary entity being assigned.
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
