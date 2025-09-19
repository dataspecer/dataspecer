import { isVisualDiagramNode,
  isVisualGroup,
  isVisualModel,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualEntity,
  VisualModel,
  VisualRelationship,
  WritableVisualModel
} from "@dataspecer/visual-model";
import { VisualModelDiagramNode } from "@/diagram";
import { ModelGraphContextType } from "@/context/model-context";
import { UseNotificationServiceWriterType } from "@/notification/notification-service-context";
import { AnchorOverrideSetting, getDefaultUserGivenAlgorithmConfigurationsFull, XY } from "@dataspecer/layout";
import { addVisualNode } from "@/dataspecer/visual-model/operation/add-visual-node";
import { UseDiagramType } from "@/diagram/diagram-hook";
import { addVisualDiagramNode } from "@/dataspecer/visual-model/operation/add-visual-diagram-node";
import {
  getBotRightPosition,
  getClassesAndDiagramNodesModelsFromVisualModelRecursively,
  getTopLeftPosition,
  isVisualEdgeEnd,
  VisualEdgeEndPoint
} from "./utilities";
import { ClassesContextType } from "@/context/classes-context";
import {
  SemanticModelClass,
  SemanticModelGeneralization,
  SemanticModelRelationship
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { getSemanticConnectionEndConcepts } from "@/util/relationship-utils";
import { layoutActiveVisualModelAction } from "./layout-visual-model";

/**
 * Puts the content of the {@link diagramNode} on canvas, removes the node and puts its content on canvas.
 * So basically replaces the {@link diagramNode} with its content.
 */
export function putVisualDiagramNodeContentToVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  classesContext: ClassesContextType,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  visualModel: WritableVisualModel,
  diagramNode: VisualModelDiagramNode,
): void {
  const referencedVisualModel = graph.visualModels.get(diagramNode.externalIdentifier);
  if(referencedVisualModel === undefined) {
    notifications.error("The referenced visual model does not exist");
    return;
  }
  if(!isVisualModel(referencedVisualModel)) {
    notifications.error("The referenced visual model is not a visual model");
    return;
  }

  const availableVisualModels = graph.aggregatorView.getAvailableVisualModels();

  const visualDiagramNode = visualModel.getVisualEntity(diagramNode.identifier);
  if(visualDiagramNode === null || !isVisualDiagramNode(visualDiagramNode)) {
    notifications.error("Missing visual diagram node in visual model");
    return;
  }

  copyVisualEntitiesBetweenModels(
    notifications, classesContext, graph, diagram, availableVisualModels,
    referencedVisualModel, visualModel, visualDiagramNode.position, diagramNode);

  // Ideally we would implement the rerouting for visual profile relationships somewhere down in this file,
  // but the validation in visual model handles it for us. So that seems like extra work,
  // which is not really that trivial.
  refreshVisualModel(graph);
}

function refreshVisualModel (graph: ModelGraphContextType) {
  graph.setAggregatorView(graph.aggregator.getView());
}

function copyVisualEntitiesBetweenModels(
  notifications: UseNotificationServiceWriterType,
  classesContext: ClassesContextType,
  graph: ModelGraphContextType,
  diagram: UseDiagramType,
  availableVisualModels: VisualModel[],
  copyFrom: VisualModel,
  copyTo: WritableVisualModel,
  centerPositionInNewModel: XY,
  diagramNodeWhichCausedTheCopy: VisualModelDiagramNode | null,
) {
  const visualEntitiesToMove = copyFrom.getVisualEntities();
  const nodes = [...visualEntitiesToMove.values()].filter(isVisualEdgeEnd);
  if (nodes.length === 0) {
    return;
  }

  const topLeft = getTopLeftPosition(nodes);
  const botRight = getBotRightPosition(diagram, nodes);
  const width = botRight.x - topLeft.x;
  const height = botRight.y - topLeft.y;
  const middle = {
    x: topLeft.x + width / 2,
    y: topLeft.y + height / 2
  };
  const positionShift: XY = {
    x: middle.x - centerPositionInNewModel.x,
    y: middle.y - centerPositionInNewModel.y
  };

  const originalToCopyMap = addCopiesToVisualModel(notifications, copyTo, nodes, positionShift, visualEntitiesToMove);
  if(diagramNodeWhichCausedTheCopy === null) {
    return;
  }

  rerouteEdgesFromVisualDiagramNodeToItsContent(
    notifications, classesContext, availableVisualModels,
    diagramNodeWhichCausedTheCopy.identifier, copyTo, copyFrom, originalToCopyMap);

  // Perform overlap layout so the bounding box doesn't contain any of the already present nodes
  const helpGroupContent = nodes.map(node => originalToCopyMap[node.identifier]);
  const helpGroupForLayout = copyTo.addVisualGroup({
    anchored: true,
    content: helpGroupContent
  });
  const layoutConfiguration = getDefaultUserGivenAlgorithmConfigurationsFull();
  layoutConfiguration.chosenMainAlgorithm = "elk_overlapRemoval";
  layoutConfiguration.main.elk_overlapRemoval.min_distance_between_nodes = 0;
  // We perform manual shift in elk if some nodes are anchored, so we force the check using this.
  // Note that in general case we can not tell if the graph shifted, therefore we shift only when anchors exist.
  layoutActiveVisualModelAction(notifications, classesContext, diagram, graph, copyTo, layoutConfiguration, {
    notAnchored: [],
    anchored: [],
    shouldAnchorEverythingExceptNotAnchored: AnchorOverrideSetting.AnchorEverythingExceptNotAnchored
  });
  copyTo.deleteVisualEntity(helpGroupForLayout);
}

/**
 * Reroutes the edges, which were going to the visual diagram node to the classes (and class profiles) after expansion.
 * @param originalToCopyMap maps the identifiers of the {@link modelReferencedByDiagramNode}
 *  to the new identifiers in {@link visualModelContainingDiagramNode}
 */
function rerouteEdgesFromVisualDiagramNodeToItsContent(
  notifications: UseNotificationServiceWriterType,
  classesContext: ClassesContextType,
  availableVisualModels: VisualModel[],
  diagramNodeToReroute: string,
  visualModelContainingDiagramNode: WritableVisualModel,
  modelReferencedByDiagramNode: VisualModel,
  originalToCopyMap: Record<string, string>,
) {
  // 1) Get all visual entities in diagram node
  // 2) iterate through all the possible candidates for rerouting
  // 3) Check if it should point directly to the class or visual diagram node, which is inside

  const allClasses = [
    ...classesContext.classes,
    ...classesContext.classProfiles,
  ];
  const allRelationships = [
    ...classesContext.relationships,
    ...classesContext.relationshipProfiles,
    ...classesContext.generalizations,
  ];

  const visualRelationshipsToIteratorMap: Record<string, number> = {};

  const sourceModelVisualEntities = visualModelContainingDiagramNode.getVisualEntities();
  for(const visualEntity of sourceModelVisualEntities.values()) {
    if(isVisualRelationship(visualEntity)) {
      if(visualRelationshipsToIteratorMap[visualEntity.representedRelationship] === undefined) {
        visualRelationshipsToIteratorMap[visualEntity.representedRelationship] = 0;
      }

      if(visualEntity.visualSource === diagramNodeToReroute) {
        const newEnd = rerouteToEntityInsideDiagramNode(
          notifications, allClasses, allRelationships, availableVisualModels,
          visualModelContainingDiagramNode, modelReferencedByDiagramNode, visualEntity,
          visualRelationshipsToIteratorMap, visualEntity.visualTarget, EdgeEndDirection.Source);
        if(newEnd === null) {
          visualModelContainingDiagramNode.deleteVisualEntity(visualEntity.identifier);
          continue;
        }

        const newIdentifier = originalToCopyMap[newEnd];
        visualModelContainingDiagramNode.updateVisualEntity(visualEntity.identifier, { visualSource: newIdentifier });
      }
      else if(visualEntity.visualTarget === diagramNodeToReroute) {
        // Same code but with source instead
        const newEnd = rerouteToEntityInsideDiagramNode(
          notifications, allClasses, allRelationships, availableVisualModels,
          visualModelContainingDiagramNode, modelReferencedByDiagramNode, visualEntity,
          visualRelationshipsToIteratorMap, visualEntity.visualSource, EdgeEndDirection.Target);
        if(newEnd === null) {
          visualModelContainingDiagramNode.deleteVisualEntity(visualEntity.identifier);
          continue;
        }

        const newIdentifier = originalToCopyMap[newEnd];

        visualModelContainingDiagramNode.updateVisualEntity(visualEntity.identifier, { visualTarget: newIdentifier });
      }
    }
    // Visual profile relationships are handled by visual model refresh and the validation.
  }
}

enum EdgeEndDirection {
  Source,
  Target
}

/**
 * @param visualRelationshipsToIteratorMap Maps the semantic relationship to the amount of time it was visited.
 *  This is used so we point to correct nodes in case of multi-entities
 *  (that is one semantic entity per multiple visual ones).
 */
function rerouteToEntityInsideDiagramNode(
  notifications: UseNotificationServiceWriterType,
  allClasses: (SemanticModelClass | SemanticModelClassProfile)[],
  allRelationships: (SemanticModelRelationship | SemanticModelRelationshipProfile | SemanticModelGeneralization)[],
  allAvailableVisualModels: VisualModel[],
  visualModelWithDiagramNode: VisualModel,
  referencedVisualModel: VisualModel,
  visualRelationship: VisualRelationship,
  visualRelationshipsToIteratorMap: Record<string, number>,
  otherEndOfTheVisualRelationship: string,
  visualDiagramNodeDirection: EdgeEndDirection
): string | null {
  const representedRelationship = allRelationships
    .find(relationship => relationship.id === visualRelationship.representedRelationship);
  if(representedRelationship === undefined) {
    notifications.error("Missing represented entity when rerouting visual relationship with end in the diagram node");
    return null;
  }

  const otherEnd = visualModelWithDiagramNode.getVisualEntity(otherEndOfTheVisualRelationship);
  if(otherEnd === null) {
    notifications.error(
      "Missing the node on the other end when rerouting visual relationship with end in the diagram node");
    return null;
  }

  const sourceAndTarget = getSemanticConnectionEndConcepts(representedRelationship);
  let otherSemanticEndIdentifier: string | null;
  if(visualDiagramNodeDirection === EdgeEndDirection.Source) {
    otherSemanticEndIdentifier = sourceAndTarget.source;
  }
  else {
    otherSemanticEndIdentifier = sourceAndTarget.target;
  }

  if (otherSemanticEndIdentifier === null) {
    console.error(
      "Can't find the identifier of the other end, we don't report the result in notifications, since it may be valid");
    return null;
  }

  const otherSemanticEnd = allClasses.find(item => item.id === otherSemanticEndIdentifier);
  if (otherSemanticEnd === undefined) {
    notifications.error("The other end is not present in semantic model, something is wrong");
    return null;
  }

  const directReroutingCandidates = referencedVisualModel.getVisualEntitiesForRepresented(otherSemanticEndIdentifier);
  if(directReroutingCandidates.length > 0) {
    const visitCount = visualRelationshipsToIteratorMap[visualRelationship.representedRelationship];
    const index = visitCount % directReroutingCandidates.length;
    visualRelationshipsToIteratorMap[visualRelationship.representedRelationship]++;
    return directReroutingCandidates[index].identifier;
  }
  else {
    for (const visualEntity of Object.values(referencedVisualModel.getVisualEntities())) {
      if(isVisualDiagramNode(visualEntity)) {
        const classes = getClassesAndDiagramNodesModelsFromVisualModelRecursively(
          allAvailableVisualModels, visualEntity.representedVisualModel);
        if(classes.findIndex(cclass => cclass === otherSemanticEndIdentifier) >= 0) {
          return visualEntity.identifier;
        }
      }
    }
  }

  return null;
}

/**
 * Adds copies of the {@link nodesToCopy} to the {@link copyTo} visual model.
 * Together with the other visual entities defined in {@link visualEntitiesToCopy}.
 * @returns map, which maps the originals to newly created copies.
 */
function addCopiesToVisualModel(
  notifications: UseNotificationServiceWriterType,
  copyTo: WritableVisualModel,
  nodesToCopy: VisualEdgeEndPoint[],
  positionShift: XY,
  visualEntitiesToCopy: Map<string, VisualEntity>
): Record<string, string> {
  const originalToCopyMap: Record<string, string> = {};

  // Handle nodes first, so the edges have ends in visual model
  for (const node of nodesToCopy) {
    const position = { ...node.position };
    position.x -= positionShift.x;
    position.y -= positionShift.y;
    if(isVisualNode(node)) {
      const identifier = addVisualNode(copyTo, { id: node.representedEntity }, node.model, position, [...node.content]);
      originalToCopyMap[node.identifier] = identifier;
    }
    else if(isVisualDiagramNode(node)) {
      const identifier = addVisualDiagramNode(
        copyTo, position, node.representedVisualModel);
      originalToCopyMap[node.identifier] = identifier
    }
    else {
      notifications.error("The moved edge endpoint is of unknown type");
    }
  }

  // Handle relationships
  for (const [_id, visualEntity] of visualEntitiesToCopy) {
    if(isVisualRelationship(visualEntity)) {
      const waypoints = [...visualEntity.waypoints];
      waypoints.forEach(waypoint => {
        waypoint.x -= positionShift.x;
        waypoint.y -= positionShift.y;
      });

      copyTo.addVisualRelationship({
        model: visualEntity.model,
        representedRelationship: visualEntity.representedRelationship,
        waypoints,
        visualSource: originalToCopyMap[visualEntity.visualSource],
        visualTarget: originalToCopyMap[visualEntity.visualTarget],
      });
    }
    else if(isVisualProfileRelationship(visualEntity)) {
      const waypoints = [...visualEntity.waypoints];
      waypoints.forEach(waypoint => {
        waypoint.x -= positionShift.x;
        waypoint.y -= positionShift.y;
      });
      copyTo.addVisualProfileRelationship({
        model: visualEntity.model,
        entity: visualEntity.entity,
        waypoints,
        visualSource: originalToCopyMap[visualEntity.visualSource],
        visualTarget: originalToCopyMap[visualEntity.visualTarget],
      });
    }
    else if(isVisualGroup(visualEntity)) {
      copyTo.addVisualGroup({
        anchored: visualEntity.anchored,
        content: [...visualEntity.content],
      });
    }
    else {
      // Already processed
      continue;
    }
  }

  return originalToCopyMap;
}
