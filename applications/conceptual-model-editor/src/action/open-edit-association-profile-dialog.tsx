import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { UseModelGraphContextType } from "../context/model-context";
import { ClassesContext } from "../context/classes-context";
import { Options } from "../application";
import {
  isSemanticModelRelationshipProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
  AssociationProfileDialogState,
  createEditAssociationProfileDialogState,
} from "../dialog/association-profile/edit-association-profile-dialog-state";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { createEditAssociationProfileDialog } from "../dialog/association-profile/edit-association-profile-dialog";
import { createLogger } from "../application";
import { InvalidState } from "../application/error";
import { LabelResolver } from "../dependency-tracker";
import { applyVisualColorFromDialog } from "./utilities/visual-color-utilities";
import { CmeOperationExecutor } from "../operation";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { createUpdateRelationshipProfileBatch } from "./utilities/update-relationship-profile-batch";
import { reportFailure } from "./utilities/report-failure";

const LOG = createLogger(import.meta.url);

/**
 * Open and handle edit association dialog.
 */
export function openEditAssociationProfileDialogAction(
  executor: CmeOperationExecutor,
  notifications: UseNotificationServiceWriterType,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContext,
  graph: UseModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationshipProfile,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {
  const aggregate = graph.getAggregatedEntities()?.[entity.id];
  const rawEntity = aggregate?.rawEntity;
  const aggregatedEntity = aggregate?.aggregatedEntity;
  if (!isSemanticModelRelationshipProfile(rawEntity)
    || !isSemanticModelRelationshipProfile(aggregatedEntity)) {
    LOG.error("Entity is not of expected type.", { rawEntity, aggregatedEntity });
    throw new InvalidState();
  }

  const initialState = createEditAssociationProfileDialogState(
    visualModel, options.language, model, rawEntity, aggregatedEntity,
    classes.semanticModels, tracker, labelResolver);

  const onConfirm = async (state: AssociationProfileDialogState) => {
    const outcome = await executor.execute(createUpdateRelationshipProfileBatch(
      executor.createContext, entity.id, initialState, state));
    if (reportFailure(notifications, outcome, "Can not update the association profile.")) {
      return;
    }
    applyVisualColorFromDialog(
      executor, visualModel, entity.id, initialState, state);
  };

  dialogs.openDialog(createEditAssociationProfileDialog(initialState, onConfirm));
}
