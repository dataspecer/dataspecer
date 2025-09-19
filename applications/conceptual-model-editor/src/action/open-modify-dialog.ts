import {
  isSemanticModelAttribute,
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";

import { ModelGraphContextType } from "../context/model-context";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { DialogApiContextType } from "../dialog/dialog-service";
import { Options } from "../configuration/options";
import { ClassesContextType, UseClassesContextType } from "../context/classes-context";
import { findSourceModelOfEntity } from "../service/model-service";
import { VisualModel } from "@dataspecer/visual-model";
import { isInMemorySemanticModel } from "../dataspecer/semantic-model";
import { openEditAssociationDialogAction } from "./open-edit-association-dialog";
import { openEditAssociationProfileDialogAction } from "./open-edit-association-profile-dialog";
import { openEditAttributeDialogAction } from "./open-edit-attribute-dialog";
import { openEditAttributeProfileDialogAction } from "./open-edit-attribute-profile-dialog";
import { openEditClassDialogAction } from "./open-edit-class-dialog";
import { openEditClassProfileDialogAction } from "./open-edit-class-profile-dialog";
import { createLogger } from "../application";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { isSemanticModelAttributeProfile } from "../dataspecer/semantic-model";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";

const LOG = createLogger(import.meta.url);

export function openModifyDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  notifications: UseNotificationServiceWriterType,
  classes: ClassesContextType,
  _useClasses: UseClassesContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  identifier: string,
) {
  const aggregate = graph.aggregatorView.getEntities()?.[identifier];

  const entity = aggregate.aggregatedEntity;
  if (entity === undefined || entity === null) {
    notifications.error(`Can not find the entity with identifier '${identifier}'.`);
    return;
  }
  const model = findSourceModelOfEntity(entity.id, graph.models);
  if (model === null || !isInMemorySemanticModel(model)) {
    notifications.error("Model is not writable, can not modify entity.");
    return;
  }

  // In future we should have different dialogs based on the type, for now
  // we just fall through to a single dialog for all.
  if (isSemanticModelClass(entity)) {
    openEditClassDialogAction(
      cmeExecutor, options, dialogs, classes, graph, visualModel, model,
      entity);
    return;
  } else if (isSemanticModelClassProfile(entity)) {
    openEditClassProfileDialogAction(
      cmeExecutor, options, dialogs, classes, graph,
      visualModel, model, entity);
    return;
  } else if (isSemanticModelAttribute(entity)) {
    openEditAttributeDialogAction(
      cmeExecutor, options, dialogs, classes, graph,
      visualModel, model, entity);
    return;
  } else if (isSemanticModelAttributeProfile(entity)) {
    openEditAttributeProfileDialogAction(
      cmeExecutor, options, dialogs, classes, graph, visualModel,
      model, aggregate.rawEntity as SemanticModelRelationshipProfile);
    return;
  } else if (isSemanticModelRelationship(entity)) {
    openEditAssociationDialogAction(
      cmeExecutor, options, dialogs, classes, graph,
      visualModel, model, entity);
    return;
  } else if (isSemanticModelRelationshipProfile(entity)) {
    openEditAssociationProfileDialogAction(
      cmeExecutor, options, dialogs, classes, graph, visualModel,
      model, aggregate.rawEntity as SemanticModelRelationshipProfile);
    return;
  } else if (isSemanticModelGeneralization(entity)) {
    notifications.error("Generalization modification is not supported!");
    return;
  } else {
    LOG.error("Can not open modify dialog for unknown entity type.", { entity })
    notifications.error("Unknown entity type.");
    return;
  }
};
