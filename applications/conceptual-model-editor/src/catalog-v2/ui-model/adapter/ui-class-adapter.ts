import { UI_CLASS_TYPE, UiClass, UiSemanticModel } from "../model";
import { SelectLabel, SelectLanguageString } from "./adapter-context";
import { CmeClass } from "../../../dataspecer/cme-model";

export const cmeClassToUiClass = (
  context: {
    selectLabel: SelectLabel,
    selectLanguageString: SelectLanguageString,
  },
  model: UiSemanticModel,
  entity: CmeClass,
): UiClass => {
  return {
    type: UI_CLASS_TYPE,
    model,
    identifier: entity.identifier,
    iri: entity.iri ?? "",
    label: context.selectLabel(entity.name, entity.iri, entity.identifier),
    description: context.selectLanguageString(entity.description),
  };
};
