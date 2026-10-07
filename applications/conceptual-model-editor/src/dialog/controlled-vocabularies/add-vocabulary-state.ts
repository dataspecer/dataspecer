import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { SelectState } from "../fields/select";
import { getLocalizedStringFromLanguageString } from "../../util/language-utils";
import { ControlledVocabulary } from "./controlled-vocabulary-model";


const DEFAULT_QUALIFIER_OPTION: Qualifier = "at-least-one";

export interface AddVocabularyState {

  availableVocabularies: ControlledVocabulary[];

  vocabularyPicker: SelectState;

  qualifier: Qualifier;

}

export function createAddVocabularyState(
  availableVocabularies: ControlledVocabulary[],
  language: string = "en",
): AddVocabularyState {
  return {
    availableVocabularies,
    vocabularyPicker: {
      value: null,
      items: availableVocabularies.map(vocabulary => ({
        id: vocabulary.id,
        label: getLocalizedStringFromLanguageString(vocabulary.title, language) ?? "",
      })),
    },
    qualifier: DEFAULT_QUALIFIER_OPTION,
  };
}
