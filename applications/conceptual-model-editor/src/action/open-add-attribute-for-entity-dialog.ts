import { isWritableVisualModel, VisualModel } from "@dataspecer/visual-model";

import { createLogger, Options } from "../application";
import { ClassesContextType } from "../context/classes-context";
import { ModelGraphContextType } from "../context/model-context";
import { DialogApiContextType } from "../dialog/dialog-service";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { isSemanticModelClass, SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { AttributeDialogState, createAddAttributeDialogState } from "../dialog/attribute/edit-attribute-dialog-state";
import {
  AttributeProfileDialogState,
  createAddAttributeProfileDialogState,
} from "../dialog/attribute-profile/edit-attribute-profile-dialog-state";
import { createAddAttributeDialog } from "../dialog/attribute/edit-attribute-dialog";
import {
  isSemanticModelClassProfile,
  SemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { createAddAttributeProfileDialog } from "../dialog/attribute-profile/edit-attribute-profile-dialog";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import { addSemanticAttributeToVisualModelAction } from "./add-semantic-attribute-to-visual-model";
import { attributeDialogStateToNewCmeRelationship } from "../dialog/attribute/edit-attribute-dialog-state-adapter";
import {
  attributeProfileDialogStateToNewCmeRelationshipProfile,
} from "../dialog/attribute-profile/edit-attribute-profile-dialog-state-adapter";

const LOG = createLogger(import.meta.url);

type ConfirmationCallback =
  ((state: AttributeDialogState | AttributeProfileDialogState,
    createdAttributeIdentifier: string) => void) | null

/**
 * Open and handle create attribute dialog for a node.
 */
export function openCreateAttributeForEntityDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  identifier: string,
  onConfirmCallback: ConfirmationCallback,
) {
  const aggregate = graph.aggregatorView.getEntities()?.[identifier];

  const entity = aggregate.aggregatedEntity;
  if (entity === undefined || entity === null) {
    notifications.error(`Can not find the entity with identifier '${identifier}'.`);
    return;
  }

  if (isSemanticModelClass(entity)) {
    handleCreateClassAttribute(cmeExecutor, options, dialogs,
      classes, graph, notifications, visualModel, entity, onConfirmCallback);
  } else if (isSemanticModelClassProfile(entity)) {
    handleCreateClassProfileAttribute(cmeExecutor, options, dialogs,
      classes, graph, notifications, visualModel, entity, onConfirmCallback);
  } else {
    LOG.error("Unknown entity type.", { entity });
    notifications.error("Unknown entity type.");
  }
}

function handleCreateClassAttribute(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  aggregate: SemanticModelClass,
  onConfirmCallback: ConfirmationCallback,
) {
  const initialState = createAddAttributeDialogState(
    classes, graph, visualModel, options.language, aggregate);

  const onConfirm = (state: AttributeDialogState) => {

    const result = cmeExecutor.createRelationship(
      attributeDialogStateToNewCmeRelationship(state));
    cmeExecutor.updateSpecialization(result, state.model.identifier,
      initialState.specializations, state.specializations);

    if (isWritableVisualModel(visualModel)) {
      // TODO PeSk Update visual model
      addSemanticAttributeToVisualModelAction(
        notifications, visualModel, state.domain.identifier,
        result.identifier, true);
    }

    onConfirmCallback?.(state, result.identifier);
  };

  dialogs.openDialog(createAddAttributeDialog(initialState, onConfirm));
}

function handleCreateClassProfileAttribute(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  aggregate: SemanticModelClassProfile,
  onConfirmCallback: ConfirmationCallback,
) {
  const initialState = createAddAttributeProfileDialogState(
    classes, graph, visualModel, options.language, aggregate.id);

  const onConfirm = (state: AttributeProfileDialogState) => {

    const result = cmeExecutor.createRelationshipProfile(
      attributeProfileDialogStateToNewCmeRelationshipProfile(state));
    cmeExecutor.updateSpecialization(result, state.model.identifier,
      initialState.specializations, state.specializations);

    if (isWritableVisualModel(visualModel)) {
      // TODO PeSk Update visual model
      addSemanticAttributeToVisualModelAction(
        notifications, visualModel, state.domain.identifier,
        result.identifier, true);
    }

    onConfirmCallback?.(state, result.identifier);
  };

  dialogs.openDialog(createAddAttributeProfileDialog(initialState, onConfirm));
}
