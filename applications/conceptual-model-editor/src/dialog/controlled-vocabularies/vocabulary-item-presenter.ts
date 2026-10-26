import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { VocabularyItemState } from "./vocabulary-item-state";

function changeVocabularyItemQualifier(
  state: VocabularyItemState,
  qualifier: Qualifier,
): VocabularyItemState {
  return { ...state, qualifier };
}

/**
 * Enable/disable qualifier override for inherited items
 * If override is disabled - default inherited value is used
 */
function toggleVocabularyItemOverride(
  state: VocabularyItemState,
): VocabularyItemState {
  // cannot override if qualifier is not inherited - do nothing
  if (state.inherited === null) {
    return state;
  }
  return {
    ...state,
    qualifier: state.inherited.qualifier,
    inherited: {
      ...state.inherited,
      overrideEnabled: !state.inherited.overrideEnabled,
    },
  };
}

export function createVocabularyItemPresenter(
  setState: (next: (state: VocabularyItemState) => VocabularyItemState) => void,
): VocabularyItemPresenter {
  return {
    onQualifierChange(qualifier) {
      setState(state => changeVocabularyItemQualifier(state, qualifier));
    },
    onOverrideToggle() {
      setState(state => toggleVocabularyItemOverride(state));
    },
  };
}

export interface VocabularyItemPresenter {

  onQualifierChange(qualifier: Qualifier): void;

  onOverrideToggle(): void;

}
