import { isVisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";

/**
 * Put {@link attributeIdentifier} to given {@link position} on given {@link nodeIdentifier}.
 */
export function setAttributePositionAction(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  nodeIdentifier: string,
  attributeIdentifier: string,
  position: number,
) {
  const node = visualModel.getVisualEntity(nodeIdentifier);
  if(node === null) {
    notifications.error("Node to modify attribute's position on, could not be found");
    return;
  }
  if(!isVisualNode(node)) {
    notifications.error("Node to modify attribute's position on, is not a node");
    return;
  }

  if(position < 0 || position >= node.content.length) {
    notifications.error("Given position for attribute is not valid");
    return;
  }

  const oldPosition = node.content.findIndex(attribute => attribute === attributeIdentifier);
  if(oldPosition === -1) {
    notifications.error("Given attribute does not exist on given node");
    return;
  }

  const newContent = [...node.content];
  newContent.splice(oldPosition, 1);
  newContent.splice(position, 0, attributeIdentifier);

  visualModel.updateVisualEntity(nodeIdentifier, { content: newContent })
}