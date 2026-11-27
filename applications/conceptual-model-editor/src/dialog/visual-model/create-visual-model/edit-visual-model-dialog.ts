import { DialogWrapper } from "../../dialog-api";
import { EditVisualModelDialogState } from "./edit-visual-model-dialog-state";
import { CreateVisualModelDialogView } from "./edit-visual-model-dialog-view";

export const createVisualModelDialog = (
  state: EditVisualModelDialogState,
  onConfirm: ((state: EditVisualModelDialogState) => void | Promise<void>) | null,
): DialogWrapper<EditVisualModelDialogState> => {
  return {
    label: "dialog.visual-model.label-create",
    component: CreateVisualModelDialogView,
    state,
    confirmLabel: "dialog.visual-model.ok-create",
    cancelLabel: "dialog.visual-model.cancel",
    validate: () => true,
    onConfirm,
    onClose: null,
  };
};

export const editVisualModelDialog = (
  state: EditVisualModelDialogState,
  onConfirm: ((state: EditVisualModelDialogState) => void | Promise<void>) | null,
): DialogWrapper<EditVisualModelDialogState> => {
  return {
    label: "dialog.visual-model.label-edit",
    component: CreateVisualModelDialogView,
    state,
    confirmLabel: "dialog.visual-model.ok-edit",
    cancelLabel: "dialog.visual-model.cancel",
    validate: () => true,
    onConfirm,
    onClose: null,
  };
};
