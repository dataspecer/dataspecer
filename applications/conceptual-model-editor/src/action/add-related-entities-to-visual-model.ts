import { WritableVisualModel } from "@dataspecer/visual-model";

import type { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { UseModelGraphContextType } from "../context/model-context";
import { cmeOperations } from "../operation";
import { reportFailure } from "./utilities/report-failure";

/**
 * For given class or class profile make sure, that all related entities
 * are added to the visual model.
 *
 * For example when a second end of relationship is added to the visual model,
 * this function also add the relationship.
 *
 * The related entities are read from the models of the executor,
 * so entities created in the same action are found too.
 */
export async function addRelatedEntitiesAction(
  notifications: UseNotificationServiceWriterType,
  graph: UseModelGraphContextType,
  visualModel: WritableVisualModel,
  entityIdentifier: string,
): Promise<void> {
  const executor = graph.executor();
  const outcome = await executor.execute(
    cmeOperations.showRelatedEntities.create(executor.createContext, {
      visualModel: visualModel.getIdentifier(),
      entity: entityIdentifier,
    }));
  reportFailure(notifications, outcome, "Can not add the related entities to the visual model.");
}
