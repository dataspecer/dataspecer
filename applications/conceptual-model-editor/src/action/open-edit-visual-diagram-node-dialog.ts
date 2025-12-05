import { Options } from "../application";
import { ModelGraphContextType } from "../context/model-context";
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
} from "@/dialog/visual-model/visual-diagram-node/edit-visual-diagram-node/create-edit-visual-diagram-node-dialog";
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
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  visualModelDiagramNode: VisualModelDiagramNode,
) {

  const dialogData = prepareDataForVisualDiagramNodeDialog(
    notifications, options, graph, visualModel, visualModelDiagramNode);
  if (dialogData === null) {
    return;
  }

  const onConfirm = (nextState: EditVisualDiagramNodeDialogState) => {
    dialogData.referencedVisualModel.setLabel(nextState.representedVisualModelName);

    // Hack to force update in the Header component
    const activeViewId = graph.aggregatorView.getActiveViewId();
    graph.aggregatorView.changeActiveVisualModel(activeViewId ?? null);
    graph.setAggregatorView(graph.aggregator.getView());
  };

  dialogs?.openDialog(createEditVisualDiagramNodeDialog(dialogData.state, onConfirm));

}

export function prepareDataForVisualDiagramNodeDialog(
  notifications: UseNotificationServiceWriterType,
  options: Options,
  graph: ModelGraphContextType,
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

  const referencedVisualModel = graph.aggregatorView.getAvailableVisualModels().find(
    availableModel => availableModel.getIdentifier() === visualDiagramNode.representedVisualModel);

  if (referencedVisualModel === undefined) {
    notifications.error("The edited visual diagram node has missing the referenced visual model");
    return null;
  }

  const state = createEditVisualDiagramNodeDialogState(
    options.language, referencedVisualModel.getLabel(), visualDiagramNode.representedVisualModel);

  return { visualDiagramNode, referencedVisualModel, state };
}
