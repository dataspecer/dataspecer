import { WritableVisualModel } from "@dataspecer/visual-model";
import { SemanticModelRelationship, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";

import type { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { getDomainAndRange } from "../util/relationship-utils";
import { ModelGraphContextType } from "../context/model-context";
import { withAggregatedEntity } from "./utilities";
import {
  addVisualRelationshipsWithSpecifiedVisualEnds,
} from "../dataspecer/visual-model/operation/add-visual-relationships";

/**
 * Adds given semantic relationship to visual model.
 *
 * Uses all possible relevant ends present in visual model for the relationship.
 */
export function addSemanticRelationshipToVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  entityIdentifier: string,
  modelIdentifier: string,
) {
  const entities = graph.aggregatorView.getEntities();
  withAggregatedEntity(notifications, entities,
    entityIdentifier, modelIdentifier,
    isSemanticModelRelationship, (entity) => {
      addSemanticRelationshipToVisualModelCommand(
        notifications, visualModel, entity, modelIdentifier);
    });
}

function addSemanticRelationshipToVisualModelCommand(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  entity: SemanticModelRelationship,
  model: string,
) {
  const { domain, range } = getDomainAndRange(entity);
  if (domain === null || domain.concept === null || range === null || range.concept === null) {
    notifications.error("Invalid relationship entity.");
    console.error("Ignored relationship as ends are null.", { domain, range, entity });
    return;
  }

  const visualSources = visualModel.getVisualEntitiesForRepresented(domain.concept);
  const visualTargets = visualModel.getVisualEntitiesForRepresented(range.concept);
  if (visualSources.length === 0 || visualTargets.length === 0) {
    notifications.error("Ends of the relation are not in the visual model.");
    console.warn("Missing visual entities for ends.", { domain, range, entity, visualSources, visualTargets });
    return;
  }
  //
  addVisualRelationshipsWithSpecifiedVisualEnds(
    visualModel, model, entity.id,
    visualSources, visualTargets
  );
}
