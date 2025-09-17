import { VisualModel } from "@dataspecer/core-v2/visual-model";

import { ModelDsIdentifier } from "../dataspecer/entity-model";
import { DialogApiContextType } from "../dialog/dialog-service";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { ModelGraphContextType } from "../context/model-context";
import {
  createProfileModelDialog,
  createProfileModelDialogState,
  ProfileModelState,
} from "../dialog/profile-model/profile-model";
import { Options } from "../application";
import { CmeOperationExecutor, ProfileEntitiesOperation } from "../operation";

export function openProfileModelDialogAction(
  cmeExecutor: CmeOperationExecutor,
  options: Options,
  dialogs: DialogApiContextType,
  notifications: UseNotificationServiceWriterType,
  graph: ModelGraphContextType,
  visualModel: VisualModel | null,
  model: ModelDsIdentifier,
) {
  const initialState = createProfileModelDialogState(
    graph.models, visualModel, options.language, model);

  const onConfirm = (state: ProfileModelState) => {
    const semanticModel = graph.models.get(state.sourceModel.identifier);
    if (semanticModel === undefined) {
      notifications.error("Invalid semantic source model");
      return;
    }
    cmeExecutor.execute<ProfileEntitiesOperation>({
      type: "profile-entities-operation",
      entities: Object.keys(semanticModel.getEntities()),
      profileModel: state.targetModel.identifier,
    });
    notifications.success("Profiles has been created.");
  };

  dialogs.openDialog(createProfileModelDialog(initialState, onConfirm));
}
