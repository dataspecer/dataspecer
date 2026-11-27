import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel, isWritableVisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { UseModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { firstInMemorySemanticModel } from "../utilities/model";
import {
  AssociationDialogState,
  createNewAssociationDialogState,
} from "../dialog/association/edit-association-dialog-state";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import {
  addVisualRelationshipsWithSpecifiedVisualEnds,
} from "../dataspecer/visual-model/operation/add-visual-relationships";
import { createNewAssociationDialog } from "../dialog/association/edit-association-dialog";
import { CmeOperationExecutor } from "../operation";
import { createCreateRelationshipBatch } from "./utilities/update-relationship-batch";
import { reportFailure } from "./utilities/report-failure";
import { LabelResolver } from "../dependency-tracker";
import { ClassesContext } from "../context/classes-context";

/**
 * Open and handle create association dialog.
 */
export function openCreateAssociationDialogAction(
  executor: CmeOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  defaultModel: InMemorySemanticModel | null,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {

  const model = defaultModel ?? firstInMemorySemanticModel(classes.semanticModels);
  if (model === null) {
    notifications.error("You have to create a writable vocabulary first!");
    return;
  }

  const initialState = createNewAssociationDialogState(
    visualModel, options.language, model.getId(), tracker, labelResolver);

  const onConfirm = async (state: AssociationDialogState) => {
    const { batch, created: result } = createCreateRelationshipBatch(executor.createContext, state);
    const outcome = await executor.execute(batch);
    if (reportFailure(notifications, outcome, "Can not create the association.")) {
      return;
    }

    if (isWritableVisualModel(visualModel)) {
      const visualSources = visualModel.getVisualEntitiesForRepresented(state.domain.identifier);
      const visualTargets = visualModel.getVisualEntitiesForRepresented(state.range.identifier);
      if (visualSources.length > 0 && visualTargets.length > 0) {
        // Both ends are in the visual model with at least one node.
        addVisualRelationshipsWithSpecifiedVisualEnds(
          visualModel, result.model, result.identifier, visualSources, visualTargets);
      }
    }

  };

  dialogs.openDialog(createNewAssociationDialog(initialState, onConfirm));
}
