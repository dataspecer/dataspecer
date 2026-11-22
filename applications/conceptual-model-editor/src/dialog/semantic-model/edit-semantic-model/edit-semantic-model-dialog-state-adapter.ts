import {
  CmeSemanticModel,
  CmeSemanticModelNameLanguage,
  CmeSemanticModelType,
} from "../../../dataspecer/cme-model";
import { EditSemanticModelDialogState } from "./edit-semantic-model-dialog-state";

export function createEditSemanticModelDialogState(
  language: string,
  semanticModel: CmeSemanticModel,
): EditSemanticModelDialogState {

  // Dialog customization based on the model's type.
  let labelDisabled = false;
  let baseIriDisabled = false;
  switch (semanticModel.modelType) {
  case CmeSemanticModelType.DefaultSemanticModel:
    labelDisabled = true;
    baseIriDisabled = true;
    break;
  case CmeSemanticModelType.ExternalSemanticModel:
    labelDisabled = true;
    baseIriDisabled = true;
    break;
  case CmeSemanticModelType.InMemorySemanticModel:
    labelDisabled = false;
    baseIriDisabled = false;
    break;
  }

  return {
    language,
    modelType: semanticModel.modelType,
    identifier: semanticModel.identifier,
    color: semanticModel.color,
    baseIri: semanticModel.baseIri ?? "",
    baseIriDisabled,
    label: semanticModel.name[CmeSemanticModelNameLanguage],
    labelDisabled,
  };
}
