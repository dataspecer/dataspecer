import {
  type VisualEntity,
  type VisualModel,
  WritableVisualModel,
  isVisualGroup,
  isVisualProfileRelationship,
  isVisualRelationship,
} from "@dataspecer/visual-model";
import { removeVisualEntitiesFromVisualModelAction } from "./remove-visual-entities-from-visual-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { isVisualEdgeEnd } from "./utilities";

/**
 * Remove entity and related entities from visual model.
 */
export function removeFromVisualModelByVisualAction(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  identifiers: string[],
) {
  const getVisualEntitiesForIdentifier = (identifier: string) => {
    const visualEntity = visualModel.getVisualEntity(identifier)
    return visualEntity === null ? [] : [visualEntity];
  };

  const entitiesToRemove = collectDirectVisualEntitiesToRemove(
    visualModel, identifiers, getVisualEntitiesForIdentifier, true);
  removeVisualEntitiesFromVisualModelAction(notifications, visualModel, entitiesToRemove);
}

/**
 * This is "direct" variant, that is it doesn't take into consideration "delegated" visual entities,
 * that is for example when we pass in class which is hidden inside visual diagram node. Then this method
 * won't find visual relationships going from the visual diagram node,
 * where the semantic source is the passed in class (that is one of the {@link identifiers}),
 * because it is indirect. (If we passed in the visual diagram node instead, it would be found)
 * @param getVisualEntitiesForIdentifier is any method,
 *  which can transform given identifier from {@link identifiers} into VisualEntity[].
 * @param shouldReportMissingVisualEntity if true then we report to console identifiers,
 *  which have no VisualEntity. In some cases that is valid case, for example when we are working with
 *  represented, then some entities may be hidden in the visual diagram node,
 *  therefore there is no direct visual for it.
 *  So for such cases it makes sense to set the argument to false.
 *
 * @returns Returns entities that are related to the removed entity.
 */
export function collectDirectVisualEntitiesToRemove(
  visualModel: VisualModel,
  identifiers: string[],
  getVisualEntitiesForIdentifier: (identifier: string) => VisualEntity[],
  shouldReportMissingVisualEntity: boolean,
) {
  const visualEntitesToRemove = [];
  for (const identifier of identifiers) {
    // Find the visual entities.
    const visualEntities: VisualEntity[] = getVisualEntitiesForIdentifier(identifier);
    if (visualEntities.length === 0) {
      // The entity is not part of the visual model and thus should not be visible.
      // We ignore the operation for such entity.
      if(shouldReportMissingVisualEntity) {
        console.error("Missing visual entity.", { identifier, visualModel });
      }
      continue;
    }

    for(const visualEntity of visualEntities) {
      visualEntitesToRemove.push(...collectVisualEntitiesToRemoveInternal(
        visualModel, visualEntity));
      visualEntitesToRemove.push(visualEntity);
    }
  }

  return visualEntitesToRemove;
}

/**
 * Return entities that are related to the removed entity.
 * TODO: Move this to the visual model.
 */
function collectVisualEntitiesToRemoveInternal(
  visualModel: VisualModel,
  removedEntity: VisualEntity,
) {
  if (!isVisualEdgeEnd(removedEntity)) {
    // If removed entity is not a node, there are no related
    // visual entities.
    return [];
  }

  return [...visualModel.getVisualEntities().values()].filter(entity => {
    // We look connection to the removed entity.
    if (isVisualRelationship(entity) || isVisualProfileRelationship(entity)) {
      const shouldBeRemoved = entity.visualSource === removedEntity.identifier ||
                            entity.visualTarget === removedEntity.identifier;
      return shouldBeRemoved;
    }
    else if(isVisualGroup(entity)) {

      const shouldBeRemoved = entity.content.includes(removedEntity.identifier);
      return shouldBeRemoved;
    }
    return false;
  });
}