import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { EntityDsIdentifier } from "../../dataspecer/entity-model";
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";

export type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";

/**
 * Reference from an assignment to a controlled vocabulary. The vocabulary
 * may not be available, e.g. when it has been deleted, while the assignment
 * itself still exists.
 */
export type ControlledVocabularyReference = {
  state: 'found',
  vocabulary: ControlledVocabulary,
} | {
  state: 'not_found',
  vocabularyId: EntityDsIdentifier,
};

export function getReferencedVocabularyId(
  reference: ControlledVocabularyReference,
): EntityDsIdentifier {
  return reference.state === "found"
    ? reference.vocabulary.id
    : reference.vocabularyId;
}

export interface ControlledVocabularyUsage {

  /**
   * Id of the ControlledVocabularyAssignment entity this usage was read
   * from - the owning class profile's own id when used as "added", the
   * ancestor's id when used as "inherited" (a potential override target).
   */
  assignmentId: EntityDsIdentifier;

  vocabulary: ControlledVocabularyReference;

  qualifier: Qualifier;

}

export interface ControlledVocabularyOverride {

  /**
   * This override's own persisted ControlledVocabularyAssignment id.
   */
  id: EntityDsIdentifier;

  /**
   * Id of the inherited ControlledVocabularyAssignment this one overrides -
   * matches ControlledVocabularyUsage.assignmentId of the inherited item.
   */
  targetAssignmentId: EntityDsIdentifier;

  qualifier: Qualifier;

}
