import { DialogWrapper } from "../../../../dialog/dialog-api";
import {
  EditVisualDiagramNodeDialogState,
} from "../edit-visual-diagram-node/edit-visual-diagram-node-dialog-controller";
import { VisualDiagramNodeInfoDialog } from "./visual-diagram-node-info-dialog";

export const createVisualDiagramNodeInfoDialog = (
  state: EditVisualDiagramNodeDialogState,
  onConfirm: ((state: EditVisualDiagramNodeDialogState) => void) | null,
): DialogWrapper<EditVisualDiagramNodeDialogState> => {
  return {
    label: "dialog.visual-diagram-node.label-info",
    component: VisualDiagramNodeInfoDialog,
    state,
    confirmLabel: null,
    cancelLabel: "dialog.visual-diagram-node.cancel",
    validate: () => true,
    onConfirm,
    onClose: null,
  };
};
