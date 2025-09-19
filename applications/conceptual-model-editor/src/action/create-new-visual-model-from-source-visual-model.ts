import {
  isVisualDiagramNode,
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  VisualModel,
  VisualProfileRelationship,
  VisualRelationship,
  WritableVisualModel
} from "@dataspecer/visual-model";
import { ModelGraphContextType, UseModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { createWritableVisualModel } from "@/dataspecer/visual-model/visual-model-factory";

/**
 *
 * @param sourceVisualModel Represents the source model from which should be the initial
 *  content of the new visual model copied.
 *  If null then this method only creates new empty visual model.
 * @param newVisualModelInitialNodes visual identifiers of the nodes copied to the new model.
 * @returns Returns created visual model.
 */
export function createNewVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  useGraph: UseModelGraphContextType,
  sourceVisualModel: VisualModel | null,
  newVisualModelName: LanguageString | null,
  newVisualModelInitialNodes: string[],
  newVisualModelInitialEdges: string[],
): WritableVisualModel {

  const activeVisualModel = graph.aggregatorView.getActiveVisualModel();
  const model = createWritableVisualModel(activeVisualModel);

  if(sourceVisualModel !== null) {
    const oldToNewIdMapping = addNodesFromSourceModelToTargetModel(
      notifications, sourceVisualModel,
      model, newVisualModelInitialNodes);
    addEdgesFromSourceModelToTargetModel(
      notifications, sourceVisualModel, model,
      newVisualModelInitialEdges, oldToNewIdMapping);
  }

  useGraph.addVisualModel(model);
  model.setLabel(newVisualModelName ?? { en: "Visual model" });
  graph.setAggregatorView(graph.aggregator.getView());

  return model;
}

function addNodesFromSourceModelToTargetModel(
  notifications: UseNotificationServiceWriterType,
  sourceVisualModel: VisualModel,
  targetVisualModel: WritableVisualModel,
  nodesToAdd: string[],
) {
  const oldToNewIdMapping: Record<string, string> = {};
  for (const entityIdentifier of nodesToAdd) {
    const visualEntity = sourceVisualModel.getVisualEntity(entityIdentifier);
    if(visualEntity === null) {
      notifications.error("Invalid visual entity to add to new visual model");
      continue;
    }
    if(isVisualNode(visualEntity)) {
      const newIdentifier = targetVisualModel.addVisualNode({ ...visualEntity });
      oldToNewIdMapping[visualEntity.identifier] = newIdentifier;
    }
    else if(isVisualDiagramNode(visualEntity)) {
      const newIdentifier = targetVisualModel.addVisualDiagramNode(visualEntity);
      oldToNewIdMapping[visualEntity.identifier] = newIdentifier;
    }
  }

  return oldToNewIdMapping;
}

function addEdgesFromSourceModelToTargetModel(
  notifications: UseNotificationServiceWriterType,
  sourceVisualModel: VisualModel,
  targetVisualModel: WritableVisualModel,
  edgesToAdd: string[],
  oldNodeIdToNewNodeIdMapping: Record<string, string>,
) {

  for (const entityIdentifier of edgesToAdd) {
    const visualEntity = sourceVisualModel.getVisualEntity(entityIdentifier);
    if(visualEntity === null) {
      notifications.error("Invalid visual entity to add to new visual model");
      continue;
    }
    if(isVisualRelationship(visualEntity)) {
      const newVisualRelationship = createRelationshipCopy(visualEntity, oldNodeIdToNewNodeIdMapping);
      if(newVisualRelationship === null) {
        continue;
      }
      targetVisualModel.addVisualRelationship(newVisualRelationship);
    }
    else if(isVisualProfileRelationship(visualEntity)) {
      const newVisualProfileRelationship = createRelationshipCopy(visualEntity, oldNodeIdToNewNodeIdMapping);
      if(newVisualProfileRelationship === null) {
        continue;
      }
      targetVisualModel.addVisualProfileRelationship(newVisualProfileRelationship);
    }
  }
}

/**
 * Creates new relationship based on given mapping
 */
function createRelationshipCopy<T extends Omit<VisualRelationship, "identifier" | "type"> |
                                         Omit<VisualProfileRelationship, "identifier" | "type">>(
  oldVisualRelationship: T,
  oldNodeIdToNewNodeIdMapping: Record<string, string>,
): T | null {
  const newVisualRelationship = {
    ...oldVisualRelationship,
    visualSource: oldNodeIdToNewNodeIdMapping[oldVisualRelationship.visualSource],
    visualTarget: oldNodeIdToNewNodeIdMapping[oldVisualRelationship.visualTarget],
  };

  if(newVisualRelationship.visualSource === undefined || newVisualRelationship.visualTarget === undefined) {
    return null;
  }

  return newVisualRelationship;
}
