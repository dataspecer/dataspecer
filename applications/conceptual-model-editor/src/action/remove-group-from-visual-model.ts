import { WritableVisualModel } from "@dataspecer/visual-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { removePartOfGroupContentAction } from "./remove-part-of-group-content";
import { findTopLevelGroupInVisualModel, getGroupMappings } from "./utilities";

/**
 * Removes the top level group for given {@link identifier}
 * @param identifier If null - no group is dissolved
 */
export function removeTopLevelGroupFromVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  identifier: string | null,
): void {
  if(identifier === null) {
    notifications.error("Dissolving not existing top level group");
    return;
  }

  const topLevelGroup = findTopLevelGroupInVisualModel(identifier, visualModel);

  if(topLevelGroup === null) {
    notifications.error("Could not find top level group");
    return;
  }

  removeGroupFromVisualModelAction(notifications, visualModel, topLevelGroup);
}

export function removeGroupFromVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  identifier: string | null,
): void {
  if(identifier === null) {
    notifications.error("Dissolving not existing group");
    return;
  }

  const { existingGroups } = getGroupMappings(visualModel);

  visualModel.deleteVisualEntity(identifier);
  for(const [existingGroupIdentifier] of Object.entries(existingGroups)) {
    // We have to look for the entity into the visual model again, because it might have been removed in cascade
    if(existingGroupIdentifier === identifier || visualModel.getVisualEntity(existingGroupIdentifier) === null) {
      continue;
    }
    removePartOfGroupContentAction(notifications, visualModel, existingGroupIdentifier, [identifier], false);
  }
}
