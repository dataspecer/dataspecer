import { VisualModel } from "@dataspecer/visual-model";
import { ModelDsIdentifier } from "../../../dataspecer/entity-model";
import {
  CmeSemanticModel,
  semanticModelMapToCmeSemanticModel,
} from "../../../dataspecer/cme-model";
import { configuration, t } from "../../../application";
import { SemanticModel } from "../../../dataspecer/semantic-model";

export interface ProfileModelState {

  /**
   * Primary data language for the dialog.
   */
  language: string;

  models: CmeSemanticModel[];

  sourceModel: CmeSemanticModel;

  targetModel: CmeSemanticModel;

}

export function createProfileModelDialogState(
  modelMap: Map<string, SemanticModel>,
  visualModel: VisualModel | null,
  language: string,
  sourceModelIdentifier: ModelDsIdentifier,
): ProfileModelState {
  const models = semanticModelMapToCmeSemanticModel(
    modelMap, visualModel,
    configuration().defaultModelColor,
    identifier => t("model-service.model-label-from-id", identifier));

  const sourceModel =
    models.find(item => item.identifier === sourceModelIdentifier)
    ?? models[0];
  const targetModel =
    models.find(item => item.identifier !== sourceModel.identifier)
    ?? models[0];

  return {
    language,
    models,
    sourceModel,
    targetModel,
  };
}
