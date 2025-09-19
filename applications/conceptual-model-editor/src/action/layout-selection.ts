import { ClassesContextType } from "@/context/classes-context";
import { ModelGraphContextType } from "@/context/model-context";
import { UseDiagramType } from "@/diagram/diagram-hook";
import { UseNotificationServiceWriterType } from "@/notification/notification-service-context";
import {
  isVisualNode,
  isVisualProfileRelationship,
  isVisualRelationship,
  type WritableVisualModel,
} from "@dataspecer/visual-model";
import { ExplicitAnchors, performLayout, UserGivenAlgorithmConfigurations, XY } from "@dataspecer/layout";
import { getBoundingBoxInfo } from "./utilities";
import { createExactNodeDimensionsQueryHandler, processLayoutResult } from "./layout-visual-model";

/**
 * Performs layout of given visual entities. The result is shifted in such a way that the middle of bounding boxes
 * is the same.
 * @param configuration The configuration for layouting algorithm.
 * @param explicitAnchors For more context check the type {@link ExplicitAnchors}. But in short it is used to override
 *  the anchors stored in visual model.
 * @param shouldUpdatePositionsInVisualModel If set to true, then update the visual model. If false then not and only
 *  return the result of layouting, default is true.
 * @param outsiders are elements which are not part of visual model, but we want to layout them anyways.
 *  Use-case is for example elements which are to be added to visual model.
 * @param shouldPutOutsidersInVisualModel If set to true, then the outsiders will be put into visual model,
 *  if false then not, but user can still see them in the returned result. Default is false
 * @returns The layouted visual entities
 */
export async function layoutGivenVisualEntities(
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContextType,
  diagram: UseDiagramType,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  configuration: UserGivenAlgorithmConfigurations,
  visualEntitiesToLayout: string[],
  explicitAnchors?: ExplicitAnchors,
  shouldUpdatePositionsInVisualModel?: boolean,
  outsiders?: Record<string, XY | null>,
  shouldPutOutsidersInVisualModel?: boolean,
) {
  const models = graph.models;

  const reactflowDimensionQueryHandler = createExactNodeDimensionsQueryHandler(diagram);

  outsiders = outsiders ?? {};

  const entitiesToLayout = {
    visualEntities: visualEntitiesToLayout,
    outsiders
  }

  return performLayout(
    visualModel, models, entitiesToLayout, configuration,
    reactflowDimensionQueryHandler, explicitAnchors
  ).then(layoutResult => {
    const previousVisualNodes = visualEntitiesToLayout
      .map(identifier => visualModel.getVisualEntity(identifier))
      .filter(entity => entity !== null && isVisualNode(entity));
    const previousBoundingBox = getBoundingBoxInfo(diagram, previousVisualNodes);
    const layoutedVisualNodes = Object.values(layoutResult)
      .map(entity => entity.visualEntity)
      .filter(isVisualNode);
    const newBoundingBox = getBoundingBoxInfo(diagram, layoutedVisualNodes);

    const shiftX = newBoundingBox.mid.x - previousBoundingBox.mid.x;
    const shiftY = newBoundingBox.mid.y - previousBoundingBox.mid.y;
    for (const layoutedEntity of Object.values(layoutResult)) {
      if (isVisualNode(layoutedEntity.visualEntity)) {
        layoutedEntity.visualEntity.position.x -= shiftX;
        layoutedEntity.visualEntity.position.y -= shiftY;
      }
      else if (isVisualRelationship(layoutedEntity.visualEntity) ||
        isVisualProfileRelationship(layoutedEntity.visualEntity)) {
        layoutedEntity.visualEntity.waypoints.forEach(waypoint => {
          waypoint.x -= shiftX;
          waypoint.y -= shiftY;
        });
      }
    }
    processLayoutResult(
      notifications, classes, diagram, graph, visualModel,
      shouldUpdatePositionsInVisualModel ?? true, shouldPutOutsidersInVisualModel ?? false, layoutResult);
    return layoutResult;
  }).catch((e) => {
    console.warn(e);
    return Promise.resolve();
  });
}

/**
 * Calls {@link layoutGivenVisualEntities} with default parameters
 */
export async function layouGivenVisualEntitiesAction(
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContextType,
  diagram: UseDiagramType,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  configuration: UserGivenAlgorithmConfigurations,
  visualEntitiesToLayout: string[],
  explicitAnchors?: ExplicitAnchors,
) {
  return layoutGivenVisualEntities(
    notifications, classes, diagram, graph, visualModel, configuration,
    visualEntitiesToLayout, explicitAnchors, true, {}, false);
}
