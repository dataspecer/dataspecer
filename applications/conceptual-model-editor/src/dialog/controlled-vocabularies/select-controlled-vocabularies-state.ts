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
      id: crypto.randomUUID(),
      vocabulary: usage.vocabulary,
      qualifier: override?.qualifier ?? usage.qualifier,
      inherited: {
        qualifier: usage.qualifier,
        overrideEnabled: override !== undefined,
      },
    };
  });
  const addedItems: VocabularyItemState[] = added.map(usage => ({
    id: crypto.randomUUID(),
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

/**
 * Returns the ids of items whose vocabulary and current effective qualifier
 * are not unique within the profile - i.e. the same vocabulary is assigned
 * the exact same qualifier more than once. Checked across inherited and
 * added items together, using each item's current effective qualifier
 * (the inherited default when not overridden, the override value when it
 * is). Assigning the same vocabulary with a different qualifier is not a
 * duplicate.
 */
export function findDuplicateVocabularyItemIds(
  state: SelectControlledVocabulariesState,
): Set<string> {
  const groups = new Map<string, VocabularyItemState[]>();
  for (const item of state.items) {
    const key = `${item.vocabulary.id}|${item.qualifier}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  const duplicateIds = new Set<string>();
  for (const group of groups.values()) {
    if (group.length > 1) {
      for (const item of group) {
        duplicateIds.add(item.id);
      }
    }
  }
  return duplicateIds;
}
