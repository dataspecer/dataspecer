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
  const entitiesToRemoveIdentifiers = entitiesToRemove.map(entity => entity.id);
  const removedGroups: string[] = [];
  entitiesToRemove.forEach(entity => {
    if(isVisualGroup(entity) && !removedGroups.includes(entity.id)) {
      const isGroupRemoved = removePartOfGroupContentAction(
        notifications, visualModel, entity.id, entitiesToRemoveIdentifiers, false);
      if(isGroupRemoved) {
        removedGroups.push(entity.id);
      }
      return;
    }
    visualModel.deleteVisualEntity(entity.id);
  });
}
