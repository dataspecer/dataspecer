import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContextType } from "../context/classes-context";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  AttributeProfileDialogState,
  createEditAttributeProfileDialogState,
} from "../dialog/attribute-profile/edit-attribute-profile-dialog-state";
import { createEditAttributeProfileDialog } from "../dialog/attribute-profile/edit-attribute-profile-dialog";
import {
  attributeProfileDialogStateToNewCmeRelationshipProfile,
} from "../dialog/attribute-profile/edit-attribute-profile-dialog-state-adapter";

/**
 * Open and handle edit Attribute dialog.
 */
export function openEditAttributeProfileDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelRelationshipProfile,
) {
  const initialState = createEditAttributeProfileDialogState(
    classes, graph, visualModel, options.language, model, entity.id);

  const onConfirm = (state: AttributeProfileDialogState) => {
    cmeExecutor.updateRelationshipProfile({
      identifier: entity.id,
      ...attributeProfileDialogStateToNewCmeRelationshipProfile(state),
    });
    cmeExecutor.updateSpecialization(
      { identifier: entity.id, model: model.getId() },
      state.model.identifier,
      initialState.specializations, state.specializations);
  };

  dialogs.openDialog(createEditAttributeProfileDialog(initialState, onConfirm));
}
