import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { ControlledVocabulary } from "./controlled-vocabulary-model";

export interface VocabularyItemState {

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
  return { vocabulary, qualifier, inherited };
}
