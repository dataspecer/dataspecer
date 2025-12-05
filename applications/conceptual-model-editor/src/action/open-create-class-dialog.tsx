import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel, isWritableVisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContextType } from "../context/classes-context";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { firstInMemorySemanticModel } from "../utilities/model";
import { addSemanticClassToVisualModelAction } from "./add-class-to-visual-model";
import { UseDiagramType } from "../diagram/diagram-hook";
import { ClassDialogState, createNewClassDialogState } from "../dialog/class/edit-class-dialog-state";
import { createNewClassDialog } from "../dialog/class/edit-class-dialog";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { classDialogStateToNewCmeClass } from "../dialog/class/edit-class-dialog-state-adapter";
import { CmeReference } from "../dataspecer/cme-model/model";

/**
 * Open and handle create class dialog.
 */
export function openCreateClassDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  diagram: UseDiagramType,
  defaultModel: InMemorySemanticModel | null,
  position: { x: number, y: number } | null,
  onConfirmCallback: ((created: CmeReference, state: ClassDialogState) => void) | null,
) {

  const model = defaultModel ?? firstInMemorySemanticModel(graph.models);
  if (model === null) {
    notifications.error("You have to create a writable vocabulary first!");
    return;
  }

  const initialState = createNewClassDialogState(
    classes, graph, visualModel, options.language, model.getId());

  const onConfirm = (state: ClassDialogState) => {

    const result = cmeExecutor.createClass(
      classDialogStateToNewCmeClass(state));
    cmeExecutor.updateSpecialization(result, state.model.identifier,
      initialState.specializations, state.specializations);

    // Add to visual model if possible.
    if (isWritableVisualModel(visualModel)) {
      // TODO PeSk Update visual model
      addSemanticClassToVisualModelAction(
        notifications, graph, classes, visualModel, diagram,
        result.identifier, result.model,
        position);
    }

    onConfirmCallback?.(result, state);
  };

  dialogs.openDialog(createNewClassDialog(initialState, onConfirm));
}
