import { isVisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";

/**
 * Remove entity and related entities from visual model.
 */
export function removeAttributesFromVisualNodeAction(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  domainNodeIdentifier: string,
  attributesToRemove: string[],
) {
  const node = visualModel.getVisualEntity(domainNodeIdentifier);
  if(node === null) {
    notifications.error("Domain visual node for attributes to be removed is missing.");
    return;
  }
  if(!isVisualNode(node)) {
    notifications.error("Domain visual node for attributes to be removed is missing.");
    return;
  }

  const content = node.content.filter(attribute => !attributesToRemove.includes(attribute));
  visualModel.updateVisualEntity(domainNodeIdentifier, { content });
}
