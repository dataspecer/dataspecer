import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContextType } from "../context/classes-context";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  AssociationProfileDialogState,
  createEditAssociationProfileDialogState,
} from "../dialog/association-profile/edit-association-profile-dialog-state";
import { createEditAssociationProfileDialog } from "../dialog/association-profile/edit-association-profile-dialog";
import {
  associationProfileDialogStateToNewCmeRelationshipProfile,
} from "../dialog/association-profile/edit-association-profile-dialog-state-adapter";

/**
 * Open and handle edit association dialog.
 */
export function openEditAssociationProfileDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationshipProfile,
) {
  const initialState = createEditAssociationProfileDialogState(
    classes, graph, visualModel, options.language, model, entity.id);

  const onConfirm = (state: AssociationProfileDialogState) => {
    cmeExecutor.updateRelationshipProfile({
      identifier: entity.id,
      ...associationProfileDialogStateToNewCmeRelationshipProfile(state),
    });
    cmeExecutor.updateSpecialization(
      { identifier: entity.id, model: model.getId() },
      state.model.identifier,
      initialState.specializations, state.specializations);
  };

  dialogs.openDialog(createEditAssociationProfileDialog(initialState, onConfirm));
}
