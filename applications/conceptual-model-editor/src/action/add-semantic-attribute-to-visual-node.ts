import { VisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";

/**
 * Adds semantic {@link attribute} to {@link domainNode} on given {@link position}.
 * If the attribute is already present, it is not added and error is either reported or not
 * based on the {@link shouldReportDuplicateAsNotification}.
 * @param position is the position to put the attribute on, if null it is put at the end.
 */
export function addSemanticAttributeToVisualNodeAction(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  domainNode: VisualNode,
  attribute: string,
  position: number | null,
  shouldReportDuplicateAsNotification: boolean,
): void {
  if(domainNode.content.includes(attribute)) {
    if(shouldReportDuplicateAsNotification) {
      notifications.error("The given attribute to be shown is already present on the visual node");
    }
    return;
  }

  const validPosition = position ?? domainNode.content.length;

  const newContent = [...domainNode.content];
  newContent.splice(validPosition, 0, attribute);

  visualModel.updateVisualEntity(domainNode.identifier, { content: newContent });
}
