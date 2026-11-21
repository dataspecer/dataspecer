import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { SemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import { VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import {
  createEditGeneralizationDialogState,
  GeneralizationDialogState,
} from "../dialog/generalization/edit-generalization-dialog-state";
import { createEditGeneralizationDialog } from "../dialog/generalization/edit-generalization-dialog";
import { applyVisualColorFromDialog } from "./utilities/visual-color-utilities";
import { CmeOperationExecutor } from "../operation";

/**
 * Generalization has only visual properties to edit, so it must be
 * shown in the visual model.
 */
export function openEditGeneralizationDialogAction(
  executor: CmeOperationExecutor,
  dialogs: DialogApiContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelGeneralization,
) {
  const initialState = createEditGeneralizationDialogState(
    visualModel, model.getId(), entity);

  if (!initialState.visualColorAvailable) {
    notifications.error("Generalization is not shown in the active visual model, there is nothing to edit.");
    return;
  }

  const onConfirm = (state: GeneralizationDialogState) => {
    applyVisualColorFromDialog(
      executor, visualModel, entity.id, initialState, state);
  };

  dialogs.openDialog(createEditGeneralizationDialog(initialState, onConfirm));
}
