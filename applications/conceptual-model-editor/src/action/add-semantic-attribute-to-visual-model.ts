import { isVisualNode, WritableVisualModel } from "@dataspecer/visual-model";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { addSemanticAttributeToVisualNodeAction } from "./add-semantic-attribute-to-visual-node";

/**
 * Adds semantic {@link attribute} to every node representing class identified by {@link domainIdentifier}.
 * Of course if the node already has the attribute, it won't have it two times after this method finished.
 * @param shouldReportDuplicateAsNotification if true then duplicates are reported, otherwise not.
 */
export function addSemanticAttributeToVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  visualModel: WritableVisualModel,
  domainIdentifier: string,
  attribute: string,
  shouldReportDuplicateAsNotification: boolean,
) {
  const visualNodes = visualModel.getVisualEntitiesForRepresented(domainIdentifier);
  for (const visualNode of visualNodes) {
    if(!isVisualNode(visualNode)) {
      notifications.error("Given domain is not of a type visual node");
      continue;
    }

    addSemanticAttributeToVisualNodeAction(
      notifications, visualModel, visualNode, attribute, null, shouldReportDuplicateAsNotification);
  }
}
