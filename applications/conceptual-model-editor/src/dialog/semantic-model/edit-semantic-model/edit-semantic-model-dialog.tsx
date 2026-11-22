import { DialogWrapper } from "../../dialog-api";

import { EditSemanticModelDialogState } from "./edit-semantic-model-dialog-state";
import { EditSemanticModelDialog } from "./edit-semantic-model-dialog-view";

export const createEditSemanticModelDialog = (
  state: EditSemanticModelDialogState,
  onConfirm: ((state: EditSemanticModelDialogState) => void | Promise<void>) | null,
): DialogWrapper<EditSemanticModelDialogState> => {
  return {
    label: "edit-semantic-model-dialog.title",
    component: EditSemanticModelDialog,
    state,
    confirmLabel: "edit-semantic-model-dialog.ok",
    cancelLabel: "edit-semantic-model-dialog.cancel",
    validate: () => true,
    onConfirm,
    onClose: null,
  };
};
