import { Entity } from "@dataspecer/core/entity-model";
import { EntityIdentifier } from "../../../entity-model/entity.ts";

export type Qualifier = "MUST" | "AT_LEAST_1" | "RECOMMENDED" | "MAY";

/**
 * `null` means "no override" 
 * `{kind: "local"}` targets another assignment entity in this model
 * `{kind: "imported"}` is used when the override target came from an imported DSV document rather than from a local assignment 
 * - the IRI is stored verbatim and never resolved locally
 */
export type ControlledVocabularyAssignmentReplaces =
  | { kind: "local"; target: EntityIdentifier }
  | { kind: "imported"; iri: string }
  | null;

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

  qualifier: Qualifier;

  /**
   * Non-null when this assignment overrides an inherited assignment.
   */
  replaces: ControlledVocabularyAssignmentReplaces;

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
