import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { createSelectPresenter, SelectPresenter } from "../../../src-v2/shared/dialog/select";
import { AddVocabularyState } from "./add-vocabulary-state";

export function createAddVocabularyPresenter(
  setState: (next: (state: AddVocabularyState) => AddVocabularyState) => void,
): AddVocabularyPresenter {
  return {
    vocabularyPicker: createSelectPresenter(next => {
      setState(state => ({ ...state, vocabularyPicker: next(state.vocabularyPicker) }));
    }),
    onQualifierChange(qualifier) {
      setState(state => ({ ...state, qualifier }));
    },
  };
}

export interface AddVocabularyPresenter {

  vocabularyPicker: SelectPresenter;

  onQualifierChange(qualifier: Qualifier): void;

}
