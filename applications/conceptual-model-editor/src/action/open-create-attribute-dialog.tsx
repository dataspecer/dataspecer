import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { isWritableVisualModel, VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContextType } from "../context/classes-context";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { firstInMemorySemanticModel } from "../utilities/model";
import { addSemanticAttributeToVisualModelAction } from "./add-semantic-attribute-to-visual-model";
import { AttributeDialogState, createNewAttributeDialogState } from "../dialog/attribute/edit-attribute-dialog-state";
import { createNewAttributeDialog } from "../dialog/attribute/edit-attribute-dialog";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { attributeDialogStateToNewCmeRelationship } from "../dialog/attribute/edit-attribute-dialog-state-adapter";

/**
 * Open and handle create attribute dialog.
 */
export function openCreateAttributeDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  defaultModel: InMemorySemanticModel | null,
) {

  const model = defaultModel ?? firstInMemorySemanticModel(graph.models);
  if (model === null) {
    notifications.error("You have to create a writable vocabulary first!");
    return;
  }

  const initialState = createNewAttributeDialogState(
    classes, graph, visualModel, options.language, model.getId());

  const onConfirm = (state: AttributeDialogState) => {

    const result = cmeExecutor.createRelationship(
      attributeDialogStateToNewCmeRelationship(state));
    cmeExecutor.updateSpecialization(result, state.model.identifier,
      initialState.specializations, state.specializations);

    if(isWritableVisualModel(visualModel)) {
      // TODO PeSk Update visual model
      addSemanticAttributeToVisualModelAction(
        notifications, visualModel, state.domain.identifier,
        result.identifier, true);
    }
  };

  dialogs.openDialog(createNewAttributeDialog(initialState, onConfirm));
}
