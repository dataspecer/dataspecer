import { VisualModel } from "@dataspecer/visual-model";

import { ModelDsIdentifier } from "../dataspecer/entity-model";
import { DialogApiContextType } from "../dialog/dialog-service";
import { UseNotificationServiceWriterType } from "../notification/notification-service-context";
import { ClassesContext } from "../context/classes-context";
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
  classes: ClassesContext,
  visualModel: VisualModel | null,
  model: ModelDsIdentifier,
) {
  const initialState = createProfileModelDialogState(
    classes.semanticModels, visualModel, options.language, model);

  const onConfirm = (state: ProfileModelState) => {
    const semanticModel = classes.semanticModels.get(state.sourceModel.identifier);
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
