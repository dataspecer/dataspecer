import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";
import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContext } from "../context/classes-context";
import { UseModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { AttributeDialogState, createEditAttributeDialogState } from "../dialog/attribute/edit-attribute-dialog-state";
import { createEditAttributeDialog } from "../dialog/attribute/edit-attribute-dialog";
import { LabelResolver } from "../dependency-tracker";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { CmeOperationExecutor } from "../operation";
import { createUpdateRelationshipBatch } from "./utilities/update-relationship-batch";
import { reportFailure } from "./utilities/report-failure";

/**
 * Open and handle edit Attribute dialog.
 */
export function openEditAttributeDialogAction(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  graph: UseModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationship,
  labelResolver: LabelResolver,
) {
  const initialState = createEditAttributeDialogState(
    classes, graph, visualModel, options.language, model, entity,
    labelResolver);

  const onConfirm = async (state: AttributeDialogState) => {
    const outcome = await executor.execute(createUpdateRelationshipBatch(
      executor.batch(), entity.id, initialState, state));
    reportFailure(notifications, outcome, "Can not update the attribute.");
  };

  dialogs.openDialog(createEditAttributeDialog(initialState, onConfirm));
}
