import { DialogWrapper } from "../../dialog-api";
import { ProfileModelState } from "./profile-model-dialog-state";
import { ProfileModelDialog } from "./profile-model-dialog-view";

export const createProfileModelDialog = (
  state: ProfileModelState,
  onConfirm: (state: ProfileModelState) => void | null,
): DialogWrapper<ProfileModelState> => {
  return {
    label: "profile-model-dialog.label",
    component: ProfileModelDialog,
    state,
    confirmLabel: "profile-model-dialog.ok",
    cancelLabel: "profile-model-dialog.cancel",
    validate: () => true,
    onConfirm,
    onClose: null,
  };
};
