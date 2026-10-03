import {
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

import { ModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { DialogApiContextType } from "../dialog/dialog-service";
import { createEntityDetailDialog } from "../dialog/obsolete/entity-detail-dialog";
import { Options } from "../configuration/options";

export function openDetailDialogAction(
  options: Options,
  dialogs: DialogApiContextType,
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  identifier: string,
) {
  const entity = graph.getEntities()?.[identifier].rawEntity;
  if (entity === undefined) {
    notifications.error(`Can not find the entity with identifier '${identifier}'.`);
    return;
  }
  // In future we should have different dialogs based on the type, for now
  // we just fall through to a single dialog for all.
  if (isSemanticModelClass(entity)
    || isSemanticModelAttribute(entity)
    || isSemanticModelRelationship(entity)
    || isSemanticModelGeneralization(entity)
    || isSemanticModelClassProfile(entity)
    || isSemanticModelRelationshipProfile(entity)
  ) {
    dialogs.openDialog(createEntityDetailDialog(graph, entity, options.language));
  } else {
    notifications.error("Unknown entity type.");
    return;
  }
};
