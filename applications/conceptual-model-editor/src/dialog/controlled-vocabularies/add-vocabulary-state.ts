import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { SelectState } from "../../../src-v2/shared/dialog/select";
import { ControlledVocabulary } from "./controlled-vocabulary-model";


const DEFAULT_QUALIFIER_OPTION: Qualifier = "AT_LEAST_1";

export interface AddVocabularyState {

  availableVocabularies: ControlledVocabulary[];

  vocabularyPicker: SelectState;

  qualifier: Qualifier;

}

export function createAddVocabularyState(
  availableVocabularies: ControlledVocabulary[],
): AddVocabularyState {
  return {
    availableVocabularies,
    vocabularyPicker: {
      value: null,
      items: availableVocabularies.map(vocabulary => ({
        id: vocabulary.id,
        label: vocabulary.name,
      })),
    },
    qualifier: DEFAULT_QUALIFIER_OPTION,
  };
}
