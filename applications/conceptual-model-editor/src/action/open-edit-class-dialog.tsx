import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";
import { SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContext } from "../context/classes-context";
import { Options } from "../application";
import { ClassDialogState, createEditClassDialogState } from "../dialog/class/edit-class-dialog-state";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { createEditClassDialog } from "../dialog/class/edit-class-dialog";
import { LabelResolver } from "../dependency-tracker";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { CmeOperationExecutor } from "../operation";
import { applyVisualColorFromDialog } from "./utilities/visual-color-utilities";
import { createUpdateClassBatch } from "./utilities/update-class-batch";
import { reportFailure } from "./utilities/report-failure";

export function openEditClassDialogAction(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelClass,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {
  const initialState = createEditClassDialogState(
    visualModel, options.language, model, entity, classes.semanticModels, tracker,
    labelResolver);

  const onConfirm = async (state: ClassDialogState) => {
    const outcome = await executor.execute(createUpdateClassBatch(
      executor.createContext, visualModel, entity.id, initialState, state));
    if (reportFailure(notifications, outcome, "Can not update the class.")) {
      return;
    }
    applyVisualColorFromDialog(
      executor, visualModel, entity.id, initialState, state);
  };

  dialogs.openDialog(createEditClassDialog(initialState, onConfirm));
}
