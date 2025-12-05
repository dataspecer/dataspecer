import { WritableVisualModel } from "@dataspecer/visual-model";

import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { ModelGraphContextType } from "../context/model-context";
import { UseDiagramType } from "../diagram/diagram-hook";
import { addRelatedEntitiesAction } from "./add-related-entities-to-visual-model";
import { ClassesContextType } from "../context/classes-context";
import { findPositionForNewNodesUsingLayouting } from "./layout-visual-model";
import { findSourceModelOfEntity } from "../service/model-service";
import { createLogger } from "../application";
import {
  isSemanticModelClassProfile,
  SemanticModelClassProfile
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { getVisualNodeContentBasedOnExistingEntities } from "./utilities";

const LOG = createLogger(import.meta.url);

export async function addSemanticClassProfileToVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  classes: ClassesContextType,
  visualModel: WritableVisualModel,
  diagram: UseDiagramType,
  entityIdentifier: string,
  // We ignore following property, as we may get invalid model.
  // Sometimes, it is a model of the profiled entity not the profile.
  _modelIdentifier: string,
  position: { x: number, y: number } | null,
) {
  const entities = graph.aggregatorView.getEntities();
  if(position === null) {
    const positions = await findPositionForNewNodesUsingLayouting(
      notifications, diagram, graph, visualModel, classes, [entityIdentifier]);
    position = positions[entityIdentifier];
  }

  const model = findSourceModelOfEntity(entityIdentifier, graph.models);
  if (model === null) {
    LOG.error("Operation ignored, we fail to find model for given entity.", { identifier: entityIdentifier });
    notifications.error("Can not find model for given entity");
    return;
  }

  const entity = entities[entityIdentifier].aggregatedEntity;
  if (entity === undefined || entity === null) {
    LOG.error("Missing semantic entity.", { identifier: entityIdentifier, entities });
    notifications.error("Missing semantic entity.");
    return;
  }

  if (isSemanticModelClassProfile(entity)) {
    addSemanticClassProfileToVisualModelCommand(
      classes, visualModel, entity, model.getId(),
      position);
    addRelatedEntitiesAction(
      notifications, graph, visualModel, Object.values(entities),
      graph.models, entity);
  } else {
    LOG.invalidEntity(entityIdentifier, "Entity is not of an expected type.", { entity });
    notifications.error("Invalid entity type!");
    return;
  }
}

function addSemanticClassProfileToVisualModelCommand(
  classes: ClassesContextType,
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
