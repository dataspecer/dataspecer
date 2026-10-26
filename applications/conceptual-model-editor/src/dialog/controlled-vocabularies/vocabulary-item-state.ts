import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { EntityDsIdentifier } from "../../dataspecer/entity-model";
import { ControlledVocabulary } from "./controlled-vocabulary-model";

export interface VocabularyItemState {

  /**
   * Stable per-instance UI identifier - not persisted, used to address a
   * row for dialog interactions (React keys, presenter dispatch).
   */
  id: string;

  /**
   * This class profile's own persisted ControlledVocabularyAssignment id,
   * or null when this row does not (yet) have one - a plain inherited
   * item that has not been overridden, or a row added/overridden during
   * this dialog session that has not been saved yet.
   */
  entityId: EntityDsIdentifier | null;

  vocabulary: ControlledVocabulary;

  /**
   * Currently effective qualifier
   */
  qualifier: Qualifier;

  /**
   * Non-null only for items inherited from a profiled class
   */
  inherited: InheritedQualifierState | null;

}

export interface InheritedQualifierState {

  /**
   * Id of the inherited ControlledVocabularyAssignment - becomes
   * replaces.target when this item is overridden.
   */
  assignmentId: EntityDsIdentifier;

  /**
   * Qualifier inherited from the profiled class
   */
  qualifier: Qualifier;

  overrideEnabled: boolean;

}

export function createVocabularyItemState(
  vocabulary: ControlledVocabulary,
  qualifier: Qualifier,
  inherited: InheritedQualifierState | null,
): VocabularyItemState {
  return { id: crypto.randomUUID(), entityId: null, vocabulary, qualifier, inherited };
}
