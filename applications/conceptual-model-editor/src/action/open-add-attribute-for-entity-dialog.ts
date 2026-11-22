import { isWritableVisualModel, VisualModel } from "@dataspecer/visual-model";

import { createLogger, Options } from "../application";
import { ClassesContext } from "../context/classes-context";
import { UseModelGraphContextType } from "../context/model-context";
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
import { CmeOperationExecutor } from "../operation";
import { createCreateRelationshipBatch } from "./utilities/update-relationship-batch";
import { createCreateRelationshipProfileBatch } from "./utilities/update-relationship-profile-batch";
import { reportFailure } from "./utilities/report-failure";
import { addSemanticAttributeToVisualModelAction } from "./add-semantic-attribute-to-visual-model";
import { LabelResolver } from "../dependency-tracker";

const LOG = createLogger(import.meta.url);

type ConfirmationCallback =
  ((state: AttributeDialogState | AttributeProfileDialogState,
    createdAttributeIdentifier: string) => void) | null

/**
 * Open and handle create attribute dialog for a node.
 */
export function openCreateAttributeForEntityDialogAction(
  executor: CmeOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  graph: UseModelGraphContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  identifier: string,
  onConfirmCallback: ConfirmationCallback,
  labelResolver: LabelResolver,
) {
  const aggregate = graph.getAggregatedEntities()?.[identifier];

  const entity = aggregate.aggregatedEntity;
  if (entity === undefined || entity === null) {
    notifications.error(`Can not find the entity with identifier '${identifier}'.`);
    return;
  }

  if (isSemanticModelClass(entity)) {
    handleCreateClassAttribute(executor, options, dialogs,
      classes, graph, notifications, visualModel, entity, onConfirmCallback,
    labelResolver);
  } else if (isSemanticModelClassProfile(entity)) {
    handleCreateClassProfileAttribute(executor, options, dialogs,
      classes, graph, notifications, visualModel, entity, onConfirmCallback,
      labelResolver);
  } else {
    LOG.error("Unknown entity type.", { entity });
    notifications.error("Unknown entity type.");
  }
}

function handleCreateClassAttribute(
  executor: CmeOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  graph: UseModelGraphContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  aggregate: SemanticModelClass,
  onConfirmCallback: ConfirmationCallback,
  labelResolver: LabelResolver,
) {
  const initialState = createAddAttributeDialogState(
    classes, graph, visualModel, options.language, aggregate,
    labelResolver);

  const onConfirm = async (state: AttributeDialogState) => {
    const { batch, created: result } = createCreateRelationshipBatch(executor.createContext, state);
    const outcome = await executor.execute(batch);
    if (reportFailure(notifications, outcome, "Can not create the attribute.")) {
      return;
    }

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
  executor: CmeOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  graph: UseModelGraphContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  aggregate: SemanticModelClassProfile,
  onConfirmCallback: ConfirmationCallback,
  labelResolver: LabelResolver,
) {
  const initialState = createAddAttributeProfileDialogState(
    classes, graph, visualModel, options.language, aggregate.id,
    labelResolver);

  const onConfirm = async (state: AttributeProfileDialogState) => {
    const { batch, created: result } = createCreateRelationshipProfileBatch(executor.createContext, state);
    const outcome = await executor.execute(batch);
    if (reportFailure(notifications, outcome, "Can not create the attribute profile.")) {
      return;
    }

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
