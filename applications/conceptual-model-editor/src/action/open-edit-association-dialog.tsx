import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";
import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";

import { DialogApiContextType } from "../dialog/dialog-service";
import { Options } from "../application";
import {
  AssociationDialogState,
  createEditAssociationDialogState,
} from "../dialog/association/edit-association-dialog-state";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { createEditAssociationDialog } from "../dialog/association/edit-association-dialog";
import { LabelResolver } from "../dependency-tracker";
import { ClassesContext } from "../context/classes-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { CmeOperationExecutor } from "../operation";
import { applyVisualColorFromDialog } from "./utilities/visual-color-utilities";
import { createUpdateRelationshipBatch } from "./utilities/update-relationship-batch";
import { reportFailure } from "./utilities/report-failure";

/**
 * Open and handle edit association dialog.
 */
export function openEditAssociationDialogAction(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationship,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {
  const initialState = createEditAssociationDialogState(
    visualModel, options.language, model, entity, classes.semanticModels, tracker,
    labelResolver);

  const onConfirm = async (state: AssociationDialogState) => {
    const outcome = await executor.execute(createUpdateRelationshipBatch(
      executor.batch(), entity.id, initialState, state));
    if (reportFailure(notifications, outcome, "Can not update the association.")) {
      return;
    }
    applyVisualColorFromDialog(
      executor, visualModel, entity.id, initialState, state);
  };

  dialogs.openDialog(createEditAssociationDialog(initialState, onConfirm));
}
