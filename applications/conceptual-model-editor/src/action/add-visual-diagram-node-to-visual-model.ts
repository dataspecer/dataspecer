import {
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualDiagramNode,
  WritableVisualModel
} from "@dataspecer/visual-model";
import {
  getViewportCenterForClassPlacement,
} from "./utilities";
import { ModelGraphContextType, UseModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { createNewVisualModelAction } from "./create-new-visual-model-from-source-visual-model";
import { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";
import { removeFromVisualModelByVisualAction } from "./remove-from-visual-model-by-visual";
import { UseDiagramType } from "@/diagram/diagram-hook";

/**
 * @returns Identifier of the created visual diagram node
 */
export function addVisualDiagramNodeForNewModelToVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  useGraph: UseModelGraphContextType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  newVisualModelName: LanguageString | null,
  containedNodes: string[],
  containedEdges: string[],
): string | null {

  const createdVisualModel = createNewVisualModelAction(
    notifications, graph, useGraph, visualModel, newVisualModelName, containedNodes, containedEdges);
  if(createdVisualModel === null) {
    notifications.error("Failed to create new visual model, so we can not create visual diagram node referencing it.");
    return null;
  }

  // Just use the center of screen instead of layouting, User will want to play with it anyways.
  const position = getViewportCenterForClassPlacement(diagram);

  const visualDiagramNode: Omit<VisualDiagramNode, "identifier" | "type"> = {
    position: {
      ...position,
      anchored: null
    },
    representedVisualModel: createdVisualModel.getIdentifier(),
  };
  const visualDiagramNodeIdentifier = visualModel.addVisualDiagramNode(visualDiagramNode);

  rerouteAllRelevantEdgesTotheVisualDiagramNode(
    notifications, visualModel, visualDiagramNodeIdentifier,
    containedNodes);
  containedNodes.forEach(node => {
    visualModel.deleteVisualEntity(node);
  });

  return visualDiagramNodeIdentifier;
}

/**
 * Reroutes all edges which were pointing to or from the nodes newly contained in
 * {@link visualModelWithVisualDiagramNode}.
 */
function rerouteAllRelevantEdgesTotheVisualDiagramNode(
  notifications: UseNotificationServiceWriterType,
  visualModelWithVisualDiagramNode: WritableVisualModel,
  visualDiagramNode: string,
  nodesInsideTheVisualDiagramNode: string[],
) {
  const edgesToRemove: string[] = [];
  const edgesToUpdate: {
    visualSource: string,
    visualTarget: string,
    edgeIdentifier: string
  }[] = [];
  for (const [_, visualEntity] of visualModelWithVisualDiagramNode.getVisualEntities()) {
    if(isVisualRelationship(visualEntity) || isVisualProfileRelationship(visualEntity)) {
      const isSourceInsideVisualDiagramNode = nodesInsideTheVisualDiagramNode.includes(visualEntity.visualSource);
      const isTargetInsideVisualDiagramNode = nodesInsideTheVisualDiagramNode.includes(visualEntity.visualTarget);
      if (isSourceInsideVisualDiagramNode && isTargetInsideVisualDiagramNode) {
        // Both ends are inside the newly created visual model representing visual diagram node, so we have to delete it
        edgesToRemove.push(visualEntity.identifier);
      }
      else if (isSourceInsideVisualDiagramNode && !isTargetInsideVisualDiagramNode) {
        edgesToUpdate.push({
          visualSource: visualDiagramNode,
          visualTarget: visualEntity.visualTarget,
          edgeIdentifier: visualEntity.identifier
        });
      }
      else if (!isSourceInsideVisualDiagramNode && isTargetInsideVisualDiagramNode) {
        edgesToUpdate.push({
          visualSource: visualEntity.visualSource,
          visualTarget: visualDiagramNode,
          edgeIdentifier: visualEntity.identifier
        });
      }
    }
  }

  removeFromVisualModelByVisualAction(notifications, visualModelWithVisualDiagramNode, edgesToRemove);
  for(const { edgeIdentifier, visualSource, visualTarget } of edgesToUpdate) {
    visualModelWithVisualDiagramNode.updateVisualEntity(edgeIdentifier, { visualSource, visualTarget });
  }
}
