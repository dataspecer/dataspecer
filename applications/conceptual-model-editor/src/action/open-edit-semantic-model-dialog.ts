import {
  isWritableVisualModel,
  VisualModel,
} from "@dataspecer/visual-model";

import {
  CmeModelOperationExecutor,
  CmeSemanticModelType,
  semanticModelToCmeSemanticModel,
} from "../dataspecer/cme-model";
import { ModelDsIdentifier } from "../dataspecer/entity-model";
import { configuration, Options } from "../application";
import { DialogApiContextType } from "../dialog/dialog-service";
import { ModelGraphContextType } from "../context/model-context";
import { SemanticModel } from "../dataspecer/semantic-model";
import {
  createEditSemanticModelDialog,
  createEditSemanticModelDialogState,
  EditSemanticModelDialogState,
  editSemanticModelDialogStateToCmeSemanticModelChange,
} from "../dialog/semantic-model/edit-semantic-model";

export function openEditSemanticModelDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  identifier: ModelDsIdentifier,
) {
  const model: SemanticModel | undefined = graph.models.get(identifier);
  if (model === undefined) {
    return;
  }

  const semanticModel = semanticModelToCmeSemanticModel(
    model, visualModel, configuration().defaultModelColor,
    (identifier) => identifier)

  const initialState = createEditSemanticModelDialogState(
    options.language, semanticModel);

  const onConfirm = (state: EditSemanticModelDialogState) => {
    if (isWritableVisualModel(visualModel)) {
      visualModel.setModelColor(state.identifier, state.color);
    }
    // We can modify only the InMemorySemanticModel.
    if (state.modelType === CmeSemanticModelType.InMemorySemanticModel) {
      cmeExecutor.updateSemanticModel(
        editSemanticModelDialogStateToCmeSemanticModelChange(state));
    }
  };

  dialogs.openDialog(createEditSemanticModelDialog(initialState, onConfirm));
}
