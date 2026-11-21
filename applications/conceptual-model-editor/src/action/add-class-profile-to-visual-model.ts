import { WritableVisualModel } from "@dataspecer/visual-model";

import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { UseModelGraphContextType } from "../context/model-context";
import { UseDiagramType } from "../diagram/diagram-hook";
import { addRelatedEntitiesAction } from "./add-related-entities-to-visual-model";
import { ClassesContext } from "../context/classes-context";
import { findPositionForNewNodesUsingLayouting } from "./layout-visual-model";
import { createLogger } from "../application";
import {
  isSemanticModelClassProfile,
  SemanticModelClassProfile
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { findSourceModelOfEntity, getVisualNodeContentBasedOnExistingEntities } from "./utilities";

const LOG = createLogger(import.meta.url);

export async function addSemanticClassProfileToVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  graph: UseModelGraphContextType,
  classes: ClassesContext,
  visualModel: WritableVisualModel,
  diagram: UseDiagramType,
  entityIdentifier: string,
  modelIdentifier: string,
  position: { x: number, y: number } | null,
) {
  const entities = graph.getAggregatedEntities();
  if(position === null) {
    const positions = await findPositionForNewNodesUsingLayouting(
      notifications, diagram, graph, visualModel, classes, [entityIdentifier]);
    position = positions[entityIdentifier];
  }

  const model = findSourceModelOfEntity(classes, entityIdentifier, modelIdentifier) ?? modelIdentifier;

  const entity = entities[entityIdentifier].aggregatedEntity;
  if (entity === undefined || entity === null) {
    LOG.error("Missing semantic entity.", { identifier: entityIdentifier, entities });
    notifications.error("Missing semantic entity.");
    return;
  }

  if (isSemanticModelClassProfile(entity)) {
    addSemanticClassProfileToVisualModelCommand(
      classes, visualModel, entity, model,
      position);
    addRelatedEntitiesAction(
      notifications, graph, classes, visualModel, Object.values(entities),
      model, entity);
  } else {
    LOG.invalidEntity(entityIdentifier, "Entity is not of an expected type.", { entity });
    notifications.error("Invalid entity type!");
    return;
  }
}

function addSemanticClassProfileToVisualModelCommand(
  classes: ClassesContext,
  visualModel: WritableVisualModel,
  entity: SemanticModelClassProfile,
  model: string,
  position: { x: number, y: number },
) {
  const content = getVisualNodeContentBasedOnExistingEntities(
    classes, entity);
  visualModel.addVisualNode({
    model: model,
    representedEntity: entity.id,
    position: {
      x: position.x,
      y: position.y,
      anchored: null,
    },
    content,
    visualModels: [],
  });
}
