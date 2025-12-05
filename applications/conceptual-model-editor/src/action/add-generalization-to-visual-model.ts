import { isSemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";

import type { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { ModelGraphContextType } from "../context/model-context";
import { withAggregatedEntity } from "./utilities";
import { withErrorBoundary } from "./utilities/error-utilities";
import { WritableVisualModel } from "@dataspecer/visual-model";
import { createVisualModelOperationExecutor } from "../dataspecer/visual-model/visual-model-operation-executor";

export function addSemanticGeneralizationToVisualModelAction(
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  visualModel: WritableVisualModel,
  entityIdentifier: string,
  modelIdentifier: string,
) {
  const executor = createVisualModelOperationExecutor(visualModel);

  const entities = graph.aggregatorView.getEntities();
  withErrorBoundary(notifications, () =>
    withAggregatedEntity(notifications, entities, entityIdentifier, modelIdentifier,
      isSemanticModelGeneralization, (entity) => {
        executor.addGeneralization({
          identifier: entityIdentifier,
          model: modelIdentifier,
        }, entity.child, entity.parent);
      })
  );
}
