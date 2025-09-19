import { DialogApiContextType } from "@/dialog/dialog-service";
import { createPerformLayoutDialog, createPerformLayoutDialogState } from "@/dialog/layout/create-perform-layout-dialog";
import { PerformLayoutDialogState } from "@/dialog/layout/perform-layout-controller";
import { getDefaultUserGivenAlgorithmConfigurationsFull } from "@dataspecer/layout";
import { ClassesContextType } from "@/context/classes-context";
import { UseNotificationServiceWriterType } from "@/notification/notification-service-context";
import { UseDiagramType } from "@/diagram/diagram-hook";
import { ModelGraphContextType } from "@/context/model-context";
import {
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualModel,
  WritableVisualModel,
} from "@dataspecer/visual-model";
import { layoutGivenVisualEntities } from "./layout-selection";

/**
 * Open layout selection dialog. On confirm the selection is layouted.
 * The selection is given in {@link nodeSelection} and {@link edgeSelection}.
 * However only subgraph is layouted, we consider only those edge,
 * which have both nodes present in {@link nodeSelection}.
 */
export function openLayoutSelectionDialogAction(
  notifications: UseNotificationServiceWriterType,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  diagram: UseDiagramType,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  nodeSelection: string[],
  edgeSelection: string[],
) {
  const onConfirm = (state: PerformLayoutDialogState) => {
    const filteredEdgeSelection = getOnlyEdgesWithBothEndsInGivenNodes(
      visualModel, nodeSelection, edgeSelection);
    const visualEntitiesToLayout = nodeSelection.concat(filteredEdgeSelection);
    const fullConfiguration = getDefaultUserGivenAlgorithmConfigurationsFull();
    fullConfiguration.main = state.configurations;
    fullConfiguration.chosenMainAlgorithm = state.chosenAlgorithm;
    layoutGivenVisualEntities(
      notifications, classes, diagram, graph, visualModel,
      fullConfiguration, visualEntitiesToLayout);
  }

  const state = createPerformLayoutDialogState("elk_layered", null);
  dialogs?.openDialog(createPerformLayoutDialog(state, onConfirm));
}

function getOnlyEdgesWithBothEndsInGivenNodes(
  visualModel: VisualModel,
  nodes: string[],
  edgeIdentifiers: string[]
): string[] {
  const edges = edgeIdentifiers
    .map(edgeIdentifier => visualModel.getVisualEntity(edgeIdentifier))
    .filter(edge => edge !== null)
    .filter(edge => isVisualRelationship(edge) || isVisualProfileRelationship(edge));
  const result = edges
    .filter(edge => nodes.includes(edge.visualSource) && nodes.includes(edge.visualTarget))
    .map(edge => edge.identifier);

  return result;
}