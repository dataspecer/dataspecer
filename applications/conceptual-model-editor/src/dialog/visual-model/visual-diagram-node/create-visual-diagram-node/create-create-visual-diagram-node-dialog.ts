import { DialogWrapper } from "../../../../dialog/dialog-api";
import {
  EditVisualDiagramNodeDialogState,
} from "../edit-visual-diagram-node/edit-visual-diagram-node-dialog-controller";
import { EditVisualDiagramNodeDialog } from "../edit-visual-diagram-node/edit-visual-diagram-node-dialog";

export const createCreateVisualDiagramNodeDialog = (
  state: EditVisualDiagramNodeDialogState,
  onConfirm: ((state: EditVisualDiagramNodeDialogState) => void) | null,
): DialogWrapper<EditVisualDiagramNodeDialogState> => {
  return {
    label: "dialog.visual-diagram-node.label-create",
    component: EditVisualDiagramNodeDialog,
    state,
    confirmLabel: "dialog.visual-diagram-node.ok-create",
    cancelLabel: "dialog.visual-diagram-node.cancel",
    validate: () => true,
    onConfirm,
    onClose: null,
  };
};