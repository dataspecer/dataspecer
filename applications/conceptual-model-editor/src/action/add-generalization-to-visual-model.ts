import type { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { UseModelGraphContextType } from "../context/model-context";
import { WritableVisualModel } from "@dataspecer/visual-model";
import { cmeOperations } from "../operation";
import { reportFailure } from "./utilities/report-failure";
import { t } from "../application";

/**
 * Shows the generalization between all visual nodes of the child and the parent.
 * Nothing is added when the child or the parent is not in the visual model.
 */
export async function addSemanticGeneralizationToVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  graph: UseModelGraphContextType,
  visualModel: WritableVisualModel,
  entityIdentifier: string,
  // Kept for the callers, the operation reads the model from the entity.
  _modelIdentifier: string,
): Promise<void> {
  const executor = graph.executor();
  const outcome = await executor.execute(
    cmeOperations.showGeneralization.create(executor.createContext, {
      visualModel: visualModel.getIdentifier(),
      entity: entityIdentifier,
    }));
  if (reportFailure(notifications, outcome, "Can not add the generalization to the visual model.")) {
    return;
  }
  if (!outcome.shown) {
    // Same message as the legacy action.
    notifications.error(t("Source or target are not in the visual model."));
  }
}
