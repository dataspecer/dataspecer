import { CmeSemanticModel } from "../../../dataspecer/cme-model";
import { UiSemanticModel } from "../model";
import { SelectLanguageString, SelectSemanticModelColor } from "./adapter-context";

export function cmeSemanticModelToUiSemanticModel(
  context: {
    selectSemanticModelColor: SelectSemanticModelColor,
    selectLanguageString: SelectLanguageString,
  },
  model: CmeSemanticModel,
): UiSemanticModel {
  return {
    identifier: model.identifier,
    modelType: model.modelType,
    label: context.selectLanguageString(model.name)
      ?? model.identifier,
    color: context.selectSemanticModelColor(model.identifier),
  };
}
