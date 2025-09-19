import {
  type VisualEntity,
  WritableVisualModel,
  isVisualGroup,
} from "@dataspecer/visual-model";

import type { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { removePartOfGroupContentAction } from "./remove-part-of-group-content";

/**
 * Removes given visual entities from visual model.
 */
export function removeVisualEntitiesFromVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  entitiesToRemove: VisualEntity[],
) {
  const entitiesToRemoveIdentifiers = entitiesToRemove.map(entity => entity.identifier);
  const removedGroups: string[] = [];
  entitiesToRemove.forEach(entity => {
    if(isVisualGroup(entity) && !removedGroups.includes(entity.identifier)) {
      const isGroupRemoved = removePartOfGroupContentAction(
        notifications, visualModel, entity.identifier, entitiesToRemoveIdentifiers, false);
      if(isGroupRemoved) {
        removedGroups.push(entity.identifier);
      }
      return;
    }
    visualModel.deleteVisualEntity(entity.identifier);
  });
}
