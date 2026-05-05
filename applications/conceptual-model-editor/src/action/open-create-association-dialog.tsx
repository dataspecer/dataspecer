import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel, isWritableVisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { firstInMemorySemanticModel } from "../utilities/model";
import {
  AssociationDialogState,
  createNewAssociationDialogState,
} from "../dialog/association/edit-association-dialog-state";
import { DialogSemanticTracker } from "../dialog/dialog-semantic-tracker";
import {
  addVisualRelationshipsWithSpecifiedVisualEnds,
} from "../dataspecer/visual-model/operation/add-visual-relationships";
import { createNewAssociationDialog } from "../dialog/association/edit-association-dialog";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  associationDialogStateToNewCmeRelationship,
} from "../dialog/association/edit-association-dialog-state-adapter";
import { LabelResolver } from "../dependency-tracker";

/**
 * Open and handle create association dialog.
 */
export function openCreateAssociationDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
  notifications: UseNotificationServiceWriterType,
  visualModel: VisualModel | null,
  defaultModel: InMemorySemanticModel | null,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {

  const model = defaultModel ?? firstInMemorySemanticModel(graph.models);
  if (model === null) {
    notifications.error("You have to create a writable vocabulary first!");
    return;
  }

  const initialState = createNewAssociationDialogState(
    visualModel, options.language, model.getId(), tracker, labelResolver);

  const onConfirm = (state: AssociationDialogState) => {

    const result = cmeExecutor.createRelationship(
      associationDialogStateToNewCmeRelationship(state));
    cmeExecutor.updateSpecialization(result, state.model.identifier,
      initialState.specializations, state.specializations);

    if (isWritableVisualModel(visualModel)) {
      const visualSources = visualModel.getVisualEntitiesForRepresented(state.domain.identifier);
      const visualTargets = visualModel.getVisualEntitiesForRepresented(state.range.identifier);
      if (visualSources.length > 0 && visualTargets.length > 0) {
        // Both ends are in the visual model with at least one node.
        addVisualRelationshipsWithSpecifiedVisualEnds(
          visualModel, result.model, result.identifier, visualSources, visualTargets);
      }
    }

  };

  dialogs.openDialog(createNewAssociationDialog(initialState, onConfirm));
}
