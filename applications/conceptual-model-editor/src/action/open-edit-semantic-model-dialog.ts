import {
  isWritableVisualModel,
  VisualModel,
} from "@dataspecer/visual-model";

import {
  semanticModelToCmeSemanticModel,
} from "../dataspecer/cme-model";
import { ModelDsIdentifier } from "../dataspecer/entity-model";
import { configuration, Options } from "../application";
import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContext } from "../context/classes-context";
import { SemanticModel } from "../dataspecer/semantic-model";
import {
  createEditSemanticModelDialog,
  createEditSemanticModelDialogState,
  EditSemanticModelDialogState,
} from "../dialog/semantic-model/edit-semantic-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { CmeOperationExecutor } from "../operation";
import { createUpdateSemanticModelBatch } from "./utilities/update-semantic-model-batch";
import { reportFailure } from "./utilities/report-failure";

export function openEditSemanticModelDialogAction(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  visualModel: VisualModel | null,
  identifier: ModelDsIdentifier,
) {
  const model: SemanticModel | undefined = classes.semanticModels.get(identifier);
  if (model === undefined) {
    return;
  }

  const semanticModel = semanticModelToCmeSemanticModel(
    model, visualModel, configuration().defaultModelColor,
    (identifier) => identifier)

  const initialState = createEditSemanticModelDialogState(
    options.language, semanticModel);

  const onConfirm = async (state: EditSemanticModelDialogState) => {
    const outcome = await executor.execute(createUpdateSemanticModelBatch(
      executor.createContext,
      isWritableVisualModel(visualModel) ? visualModel : null,
      state));
    reportFailure(notifications, outcome, "Can not update the model.");
  };

  dialogs.openDialog(createEditSemanticModelDialog(initialState, onConfirm));
}
