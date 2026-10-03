import { Options } from "../application";
import { UseModelGraphContextType } from "../context/model-context";
import { ClassesContext } from "../context/classes-context";
import { DialogApiContextType } from "../dialog/dialog-service";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import {
  isVisualDiagramNode,
  VisualDiagramNode,
  VisualModel,
  WritableVisualModel,
} from "@dataspecer/visual-model";
import { VisualModelDiagramNode } from "../diagram";
import {
  createEditVisualDiagramNodeDialog,
  createEditVisualDiagramNodeDialogState,
} from "../dialog/visual-model/visual-diagram-node/edit-visual-diagram-node/create-edit-visual-diagram-node-dialog";
import {
  EditVisualDiagramNodeDialogState,
} from "../dialog/visual-model/visual-diagram-node/edit-visual-diagram-node/edit-visual-diagram-node-dialog-controller";

/**
 * Open model to edit information about visual diagram node.
 */
export function openEditVisualDiagramNodeDialogAction(
  notifications: UseNotificationServiceWriterType,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  graph: UseModelGraphContextType,
  visualModel: WritableVisualModel,
  visualModelDiagramNode: VisualModelDiagramNode,
) {

  const dialogData = prepareDataForVisualDiagramNodeDialog(
    notifications, options, classes, visualModel, visualModelDiagramNode);
  if (dialogData === null) {
    return;
  }

  const onConfirm = (nextState: EditVisualDiagramNodeDialogState) => {
    dialogData.referencedVisualModel.setLabel(nextState.representedVisualModelName);
    graph.onVisualModelDidChange();
  };

  dialogs?.openDialog(createEditVisualDiagramNodeDialog(dialogData.state, onConfirm));

}

export function prepareDataForVisualDiagramNodeDialog(
  notifications: UseNotificationServiceWriterType,
  options: Options,
  classes: ClassesContext,
  visualModel: VisualModel,
  visualModelDiagramNode: VisualModelDiagramNode,
): {
  visualDiagramNode: VisualDiagramNode,
  referencedVisualModel: VisualModel,
  state: EditVisualDiagramNodeDialogState,
} | null {
  const visualDiagramNode = visualModel?.getVisualEntity(visualModelDiagramNode.identifier) ?? null;
  if (visualDiagramNode === null || !isVisualDiagramNode(visualDiagramNode)) {
    notifications.error("Editing non-existing visual diagram node.");
    return null;
  }

  const referencedVisualModel = classes.visualModels.get(visualDiagramNode.representedVisualModel);

  if (referencedVisualModel === undefined) {
    notifications.error("The edited visual diagram node has missing the referenced visual model");
    return null;
  }

  const state = createEditVisualDiagramNodeDialogState(
    options.language, referencedVisualModel.getLabel(), visualDiagramNode.representedVisualModel);

  return { visualDiagramNode, referencedVisualModel, state };
}
