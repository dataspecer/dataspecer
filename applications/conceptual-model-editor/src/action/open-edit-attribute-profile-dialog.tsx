import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContext } from "../context/classes-context";
import { UseModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { CmeOperationExecutor } from "../operation";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { createUpdateRelationshipProfileBatch } from "./utilities/update-relationship-profile-batch";
import { reportFailure } from "./utilities/report-failure";
import {
  AttributeProfileDialogState,
  createEditAttributeProfileDialogState,
} from "../dialog/attribute-profile/edit-attribute-profile-dialog-state";
import { createEditAttributeProfileDialog } from "../dialog/attribute-profile/edit-attribute-profile-dialog";
import { LabelResolver } from "../dependency-tracker";

/**
 * Open and handle edit Attribute dialog.
 */
export function openEditAttributeProfileDialogAction(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  graph: UseModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationshipProfile,
  labelResolver: LabelResolver,
) {
  const initialState = createEditAttributeProfileDialogState(
    classes, graph, visualModel, options.language, model, entity.id,
    labelResolver);

  const onConfirm = async (state: AttributeProfileDialogState) => {
    const outcome = await executor.execute(createUpdateRelationshipProfileBatch(
      executor.batch(), entity.id, initialState, state));
    reportFailure(notifications, outcome, "Can not update the attribute profile.");
  };

  dialogs.openDialog(createEditAttributeProfileDialog(initialState, onConfirm));
}
