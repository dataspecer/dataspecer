import { VisualModel } from "@dataspecer/visual-model";
import { SemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";

import { configuration } from "../../application";
import { ModelDsIdentifier } from "../../dataspecer/entity-model";
import {
  createVisualColorDialogState,
  type VisualColorDialogState,
} from "../visual-color/visual-color-dialog-state";

export interface GeneralizationDialogState extends VisualColorDialogState {

  /**
   * Color of the model, shown when there is no custom color.
   */
  modelColor: string;

}

export function createEditGeneralizationDialogState(
  visualModel: VisualModel | null,
  model: ModelDsIdentifier,
  entity: SemanticModelGeneralization,
): GeneralizationDialogState {
  return {
    modelColor: visualModel?.getModelColor(model)
      ?? configuration().defaultModelColor,
    ...createVisualColorDialogState(visualModel, entity.id),
  };
}
