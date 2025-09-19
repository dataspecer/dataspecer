import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { isWritableVisualModel, VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ClassesContextType } from "../context/classes-context";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import { SemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { updateVisualNodeProfiles } from "../dataspecer/visual-model/operation/update-visual-node-profiles";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  ClassProfileDialogState,
  createEditClassProfileDialogState,
} from "../dialog/class-profile/edit-class-profile-dialog-state";
import { createEditClassProfileDialog } from "../dialog/class-profile/edit-class-profile-dialog";
import {
  classProfileDialogStateToNewCmeClassProfile,
} from "../dialog/class-profile/edit-class-profile-dialog-state-adapter";

export function openEditClassProfileDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  classes: ClassesContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelClassProfile,
) {
  const initialState = createEditClassProfileDialogState(
    classes, graph, visualModel, options.language, model, entity.id);

  const onConfirm = (state: ClassProfileDialogState) => {

    cmeExecutor.updateClassProfile({
      identifier: entity.id,
      ...classProfileDialogStateToNewCmeClassProfile(state),
    });
    cmeExecutor.updateSpecialization(
      { identifier: entity.id, model: model.getId() },
      state.model.identifier,
      initialState.specializations, state.specializations);

    // We need to update visual model: profiles
    if (isWritableVisualModel(visualModel)) {
      updateVisualNodeProfiles(
        visualModel, {
          identifier: entity.id,
          model: model.getId(),
        },
        state.profiles.map(item => ({
          identifier: item.identifier,
          model: item.model
        })),
        state.profiles.map(item => ({
          identifier: item.identifier,
          model: item.model
        })));
    }
  };

  dialogs.openDialog(createEditClassProfileDialog(initialState, onConfirm));
}
