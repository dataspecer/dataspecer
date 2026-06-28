import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { isWritableVisualModel, VisualModel } from "@dataspecer/visual-model";

import { DialogApiContextType } from "../dialog/dialog-service";
import { ModelGraphContextType } from "../context/model-context";
import { Options } from "../application";
import {
  isSemanticModelClassProfile,
  SemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { updateVisualNodeProfiles } from "../dataspecer/visual-model/operation/update-visual-node-profiles";
import { CmeModelOperationExecutor } from "../dataspecer/cme-model/cme-model-operation-executor";
import {
  ClassProfileDialogState,
  createEditClassProfileDialogState,
} from "../dialog/class-profile/edit-class-profile-dialog-state";
import { DialogSemanticTracker } from "../dialog-v2/dialog-semantic-tracker";
import { createEditClassProfileDialog } from "../dialog/class-profile/edit-class-profile-dialog";
import {
  classProfileDialogStateToNewCmeClassProfile,
} from "../dialog/class-profile/edit-class-profile-dialog-state-adapter";
import { createLogger } from "../application";
import { InvalidState } from "../application/error";
import { LabelResolver } from "../dependency-tracker";

const LOG = createLogger(import.meta.url);

export function openEditClassProfileDialogAction(
  cmeExecutor: CmeModelOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  model: InMemorySemanticModel,
  entity: SemanticModelClassProfile,
  tracker: DialogSemanticTracker,
  labelResolver: LabelResolver,
) {
  const aggregate = graph.aggregatorView.getEntities()?.[entity.id];
  const rawEntity = aggregate?.rawEntity;
  if (rawEntity === null || rawEntity === undefined || !isSemanticModelClassProfile(rawEntity)) {
    LOG.error("Missing raw entity for class profile.", { entity });
    throw new InvalidState();
  }

  const initialState = createEditClassProfileDialogState(
    visualModel, options.language, model, rawEntity, graph.models, tracker,
    labelResolver);

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
