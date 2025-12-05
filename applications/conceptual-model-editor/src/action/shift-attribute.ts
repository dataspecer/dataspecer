import { isVisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";

export enum ShiftAttributeDirection {
  Up = -1,
  Down = 1,
};

/**
 * Moves attribute by {@link shiftDistance} in direction given in {@link shiftDirection}
 * @param shiftDistance should be an integer.
 *  Since we modulo, the actual number can be larger than number of attributes.
 */
export function shiftAttributePositionAction(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  nodeIdentifier: string,
  attributeIdentifier: string,
  shiftDirection: ShiftAttributeDirection,
  shiftDistance: number,
) {
  const node = visualModel.getVisualEntity(nodeIdentifier);
  if(node === null) {
    notifications.error("Node to shift attribute's position on, could not be found");
    return;
  }
  if(!isVisualNode(node)) {
    notifications.error("Node to shift attribute's position on, is not a node");
    return;
  }

  const oldPosition = node.content.findIndex(attribute => attribute === attributeIdentifier);
  if(oldPosition === -1) {
    notifications.error("Given attribute does not exist on given node");
    return;
  }

  // We add additional multiple of array size, because % doesn't like negative numbers.
  const outOfNegative = shiftDistance * node.content.length;
  const newPosition = (outOfNegative + oldPosition + shiftDistance * shiftDirection) % node.content.length;
  const newContent = [...node.content];
  newContent.splice(oldPosition, 1);
  newContent.splice(newPosition, 0, attributeIdentifier);

  visualModel.updateVisualEntity(nodeIdentifier, { "content": newContent })
}
