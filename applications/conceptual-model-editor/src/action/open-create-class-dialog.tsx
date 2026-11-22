import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel, isWritableVisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContext } from "../context/classes-context";
import { UseModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { firstInMemorySemanticModel } from "../utilities/model";
import { addSemanticClassToVisualModelAction } from "./add-class-to-visual-model";
import { UseDiagramType } from "../diagram/diagram-hook";
import { ClassDialogState, createNewClassDialogState } from "../dialog/class/edit-class-dialog-state";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { createNewClassDialog } from "../dialog/class/edit-class-dialog";
import { CmeOperationExecutor } from "../operation";
import { createCreateClassBatch } from "./utilities/update-class-batch";
import { reportFailure } from "./utilities/report-failure";
import { CmeReference } from "../dataspecer/cme-model/model";
import { LabelResolver } from "../dependency-tracker";

/**
 * Open and handle create class dialog.
 */
export function openCreateClassDialogAction(
  executor: CmeOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  graph: UseModelGraphContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  diagram: UseDiagramType,
  defaultModel: InMemorySemanticModel | null,
  position: { x: number, y: number } | null,
  onConfirmCallback: ((created: CmeReference, state: ClassDialogState) => void | Promise<void>) | null,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {

  const model = defaultModel ?? firstInMemorySemanticModel(classes.semanticModels);
  if (model === null) {
    notifications.error("You have to create a writable vocabulary first!");
    return;
  }

  const initialState = createNewClassDialogState(
    visualModel, options.language, model.getId(), tracker, labelResolver);

  const onConfirm = async (state: ClassDialogState) => {
    const { batch, created: result } = createCreateClassBatch(executor.createContext, state);
    const outcome = await executor.execute(batch);
    if (reportFailure(notifications, outcome, "Can not create the class.")) {
      return;
    }

    // Add to visual model if possible.
    if (isWritableVisualModel(visualModel)) {
      // TODO PeSk Update visual model
      await addSemanticClassToVisualModelAction(
        notifications, graph, classes, visualModel, diagram,
        result.identifier, result.model,
        position);
    }

    await onConfirmCallback?.(result, state);
  };

  dialogs.openDialog(createNewClassDialog(initialState, onConfirm));
}
