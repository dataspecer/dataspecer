import {
  ControlledVocabulary,
  ControlledVocabularyOverride,
  ControlledVocabularyUsage,
} from "./controlled-vocabulary-model";
import { AddVocabularyState } from "./add-vocabulary-state";
import { VocabularyItemState } from "./vocabulary-item-state";

export interface SelectControlledVocabulariesState {

  /**
   * Selected controlled vocabularies
   * Both inherited from an ancestor and directly added here
   */
  items: VocabularyItemState[];

  /**
   * All available controlled vocabularies that can be selected
   */
  availableVocabularies: ControlledVocabulary[];

  /**
   * Null when the "Add" button is shown, non-null while the add form is open
   */
  addForm: AddVocabularyState | null;

}

export function createSelectControlledVocabulariesState(
  inherited: ControlledVocabularyUsage[],
  overrides: ControlledVocabularyOverride[],
  added: ControlledVocabularyUsage[],
  availableVocabularies: ControlledVocabulary[],
): SelectControlledVocabulariesState {
  const inheritedItems: VocabularyItemState[] = inherited.map(usage => {
    const override = overrides.find(
      item => item.vocabularyId === usage.vocabulary.id);
    return {
      vocabulary: usage.vocabulary,
      qualifier: override?.qualifier ?? usage.qualifier,
      inherited: {
        qualifier: usage.qualifier,
        overrideEnabled: override !== undefined,
      },
    };
  });
  const addedItems: VocabularyItemState[] = added.map(usage => ({
    vocabulary: usage.vocabulary,
    qualifier: usage.qualifier,
    inherited: null,
  }));
  return {
    items: [...inheritedItems, ...addedItems],
    availableVocabularies,
    addForm: null,
  };
}

/**
 * A class profile can only contain one controlled vocabulary assignment when its qualifier is MUST.
 * Validates it across all vocabulary assignments in the profile.
 */
export function hasControlledVocabularyConflict(
  state: SelectControlledVocabulariesState,
): boolean {
  const qualifiers = state.items.map(item => item.qualifier);
  const mustCount = qualifiers.filter(qualifier => qualifier === "MUST").length;
  return mustCount > 0 && qualifiers.length > 1;
}
