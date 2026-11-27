import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { isWritableVisualModel, VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContext } from "../context/classes-context";
import { UseModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { firstInMemorySemanticModel } from "../utilities/model";
import { addSemanticAttributeToVisualModelAction } from "./add-semantic-attribute-to-visual-model";
import { AttributeDialogState, createNewAttributeDialogState } from "../dialog/attribute/edit-attribute-dialog-state";
import { createNewAttributeDialog } from "../dialog/attribute/edit-attribute-dialog";
import { CmeOperationExecutor } from "../operation";
import { createCreateRelationshipBatch } from "./utilities/update-relationship-batch";
import { reportFailure } from "./utilities/report-failure";
import { LabelResolver } from "../dependency-tracker";

/**
 * Open and handle create attribute dialog.
 */
export function openCreateAttributeDialogAction(
  executor: CmeOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  graph: UseModelGraphContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  defaultModel: InMemorySemanticModel | null,
  labelResolver: LabelResolver,
) {

  const model = defaultModel ?? firstInMemorySemanticModel(classes.semanticModels);
  if (model === null) {
    notifications.error("You have to create a writable vocabulary first!");
    return;
  }

  const initialState = createNewAttributeDialogState(
    classes, graph, visualModel, options.language, model.getId(),
    labelResolver);

  const onConfirm = async (state: AttributeDialogState) => {
    const { batch, created: result } = createCreateRelationshipBatch(executor.createContext, state);
    const outcome = await executor.execute(batch);
    if (reportFailure(notifications, outcome, "Can not create the attribute.")) {
      return;
    }

    if(isWritableVisualModel(visualModel)) {
      // TODO PeSk Update visual model
      addSemanticAttributeToVisualModelAction(
        notifications, visualModel, state.domain.identifier,
        result.identifier, true);
    }
  };

  dialogs.openDialog(createNewAttributeDialog(initialState, onConfirm));
}
