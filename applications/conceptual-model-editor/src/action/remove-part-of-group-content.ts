import { isVisualGroup, WritableVisualModel } from "@dataspecer/visual-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { removeGroupFromVisualModelAction } from "./remove-group-from-visual-model";
import { findTopLevelGroupInVisualModel } from "./utilities";

/**
 * Removes part of group's content.
 * If the group becomes single node or is empty after that, the group is deleted.
 * However the deletion is performed only if it is empty, in the other case it has to be top level group.
 * Because otherwise it is being referred to from the other group,
 * therefore we would have to repair the other group - this gets very complicated in cascade effect.
 * @returns True if the whole group was deleted
 */
export function removePartOfGroupContentAction(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  groupIdentifier: string,
  contentToRemove: string[],
  shouldReportRemovalOfInvalidContent: boolean,
): boolean {
  const group = visualModel.getVisualEntity(groupIdentifier);
  if(group === null) {
    notifications.error("Given group identifier is not present in visual model");
    return false;
  }
  if(!isVisualGroup(group)) {
    notifications.error("Given group identifier is not identifier of a group");
    return false;
  }

  const newGroupContent = group.content.filter(elementInGroup => {
    if(contentToRemove.includes(elementInGroup)) {
      if(shouldReportRemovalOfInvalidContent) {
        notifications.error(
          "Continuing in removal of group's content, but one of given element is not in present in group");
      }
      return false;
    }
    return true;
  });

  const topLevelGroup = findTopLevelGroupInVisualModel(groupIdentifier, visualModel);
  if(newGroupContent.length === 0 || (newGroupContent.length === 1 && topLevelGroup === groupIdentifier)) {
    removeGroupFromVisualModelAction(notifications, visualModel, groupIdentifier);
    return true;
  }
  else {
    // Didn't remove anything
    // We perform the check here, because we want to always remove the top level groups of size {0 or 1}
    if(group.content.length === newGroupContent.length) {
      return false;
    }
    visualModel.updateVisualEntity(groupIdentifier, { content: newGroupContent });
    return false;
  }
}
