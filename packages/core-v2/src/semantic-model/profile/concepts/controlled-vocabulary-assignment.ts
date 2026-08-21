import { Entity } from "@dataspecer/core/entity-model";
import { EntityIdentifier } from "../../../entity-model/entity.ts";

export type Qualifier = "MUST" | "AT_LEAST_1" | "RECOMMENDED" | "MAY";

/**
 * Left open for a phase-2 "imported" variant, e.g.
 * `{ kind: "imported"; iri: string }`, once DSV import/export is added.
 * `null` means "no override" - this is also how a dangling `target`
 * (the assignment it pointed at was removed) reads, since removal does
 * not eagerly clear references to it.
 */
export type ControlledVocabularyAssignmentReplaces =
  | { kind: "local"; target: EntityIdentifier }
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

}

export const CONTROLLED_VOCABULARY_ASSIGNMENT = "controlled-vocabulary-assignment";

export function isControlledVocabularyAssignment(
  entity: Entity | null,
): entity is ControlledVocabularyAssignment {
  return entity?.type.includes(CONTROLLED_VOCABULARY_ASSIGNMENT) ?? false;
}
