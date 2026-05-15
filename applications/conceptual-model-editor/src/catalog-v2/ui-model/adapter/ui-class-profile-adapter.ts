import { UI_CLASS_PROFILE_TYPE, UiClassProfile, UiReference, UiSemanticModel } from "../model";
import { SelectLabel, SelectLanguageString, SelectModelsWithEntity } from "./adapter-context";
import { CmeClassAggregate } from "../../../dataspecer/cme-model/model";

export const cmeClassAggregateToUiClassProfile = (
  context: {
    selectLabel: SelectLabel,
    selectLanguageString: SelectLanguageString,
    selectModelsWithEntity: SelectModelsWithEntity,
  },
  model: UiSemanticModel,
  entity: CmeClassAggregate,
): UiClassProfile => {

  const profiling: UiReference[] = [];
  for (const profileOf of entity.profileOf) {
    for (const model of context.selectModelsWithEntity(profileOf)) {
      profiling.push({
        identifier: profileOf,
        model,
      });
    }
  }

  return {
    type: UI_CLASS_PROFILE_TYPE,
    model,
    identifier: entity.identifier,
    iri: entity.iri ?? "",
    label: context.selectLabel(entity.name, entity.iri, entity.identifier),
    description: context.selectLanguageString(entity.description),
    usageNote: context.selectLanguageString(entity.usageNote),
    profiling,
  };
};
