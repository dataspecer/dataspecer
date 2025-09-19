import { WritableVisualModel } from "@dataspecer/visual-model";
import { isSemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";

import { getVisualNodeContentBasedOnExistingEntities, withAggregatedEntity } from "./utilities";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { ModelGraphContextType } from "../context/model-context";
import { UseDiagramType } from "../diagram/diagram-hook";
import { addRelatedEntitiesAction } from "./add-related-entities-to-visual-model";
import { findPositionForNewNodeUsingLayouting } from "./layout-visual-model";
import { ClassesContextType } from "../context/classes-context";
import { addVisualNode } from "../dataspecer/visual-model/operation/add-visual-node";

export async function addSemanticClassToVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  classes: ClassesContextType,
  visualModel: WritableVisualModel,
  diagram: UseDiagramType,
  entityIdentifier: string,
  modelIdentifier: string,
  position: { x: number, y: number } | null,
) {
  const entities = graph.aggregatorView.getEntities();
  if (position === null) {
    position = await findPositionForNewNodeUsingLayouting(
      notifications, diagram, graph, visualModel, classes, entityIdentifier);
  }

  withAggregatedEntity(notifications, entities,
    entityIdentifier, modelIdentifier,
    isSemanticModelClass, (entity) => {
      const content = getVisualNodeContentBasedOnExistingEntities(
        classes, entity);
      addVisualNode(
        visualModel,
        entity, modelIdentifier, position, content);
      addRelatedEntitiesAction(
        notifications, graph, visualModel, Object.values(entities),
        graph.models, entity);
    });
}
