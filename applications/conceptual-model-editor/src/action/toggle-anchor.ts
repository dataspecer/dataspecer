import { isVisualGroup, WritableVisualModel } from "@dataspecer/visual-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { isVisualEdgeEnd } from "./utilities";

/**
 * Changes anchor to the opposite state or given {@link isNewlyAnchored} value.
 * So if the node was not anchored then anchor it and otherway around.
 * If the identifier is group,
 * then is sets anchors of all the underlying elements to the same value.
 */
export function toggleAnchorAction(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  identifier: string,
  isNewlyAnchored?: true | null,
) {
  const visualEntity = visualModel.getVisualEntity(identifier);
  if(visualEntity === null) {
    notifications.error("The entity to change anchor for doesn't exist.");
    return;
  }
  if(isVisualEdgeEnd(visualEntity)) {
    let newAnchor: true | null;
    if(isNewlyAnchored !== undefined) {
      newAnchor = isNewlyAnchored
    }
    else {
      newAnchor = visualEntity.position.anchored === true ? null : true;
    }
    const newPosition = {
      ...visualEntity.position,
      anchored: newAnchor,
    };
    visualModel.updateVisualEntity(visualEntity.identifier, { position: newPosition });
  }
  else if(isVisualGroup(visualEntity)) {
    let newAnchor: true | null;
    if(isNewlyAnchored !== undefined) {
      newAnchor = isNewlyAnchored
    }
    else {
      newAnchor = visualEntity.anchored === true ? null : true;
    }
    visualModel.updateVisualEntity(visualEntity.identifier, { anchored: newAnchor });
    for(const elementInGroup of visualEntity.content) {
      toggleAnchorAction(notifications, visualModel, elementInGroup, newAnchor);
    }
  }
  else {
    notifications.error("The entity to change anchor for is not a node.");
  }
};
