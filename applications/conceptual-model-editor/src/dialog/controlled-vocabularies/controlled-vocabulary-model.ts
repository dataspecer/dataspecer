import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { EntityDsIdentifier } from "../../dataspecer/entity-model";
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";

export type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model";

export interface ControlledVocabularyUsage {

  /**
   * Id of the ControlledVocabularyAssignment entity this usage was read
   * from - the owning class profile's own id when used as "added", the
   * ancestor's id when used as "inherited" (a potential override target).
   */
  assignmentId: EntityDsIdentifier;

  vocabulary: ControlledVocabulary;

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
