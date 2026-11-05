// Service for RelationshipProfileCreateDialog
import { useContext, useEffect } from "react";
import { DialogWrapper } from "../../dialog-api";
import { DialogApiContextType } from "../../dialog-service";
import { DialogApiContext } from "../../dialog-context";
import { RelationshipProfileCreateDialog } from "./RelationshipProfileCreateDialog";
import {
  RelationshipProfileCreateDialogState,
  createRelationshipProfileCreateDialogState,
} from "./relationship-profile-create-dialog-state";

/**
 * Opens the RelationshipProfileCreateDialog and alerts a JSON representation of the entered data.
 */
export function openRelationshipProfileCreateDialog(dialogs: DialogApiContextType): void {
  const initialState = createRelationshipProfileCreateDialogState();

  const onConfirm = (state: RelationshipProfileCreateDialogState) => {
    alert(JSON.stringify(state, null, 2));
  };

  const dialog: DialogWrapper<RelationshipProfileCreateDialogState> = {
    label: "dialog.relationshipProfileCreate.label",
    component: RelationshipProfileCreateDialog,
    state: initialState,
    confirmLabel: "dialog.relationshipProfileCreate.ok",
    cancelLabel: "dialog.relationshipProfileCreate.cancel",
    validate: null,
    onConfirm,
    onClose: null,
  };

  dialogs.openDialog(dialog);
}

/** Hook that registers `window.openRelationshipProfileCreateDialog` for console usage. */
export function useRegisterRelationshipProfileCreateDialogToWindow(): void {
  const dialogs = useContext(DialogApiContext);

  useEffect(() => {
    if (!dialogs) return;
    (window as any).openRelationshipProfileCreateDialog = () => openRelationshipProfileCreateDialog(dialogs);
    return () => {
      delete (window as any).openRelationshipProfileCreateDialog;
    };
  }, [dialogs]);
}
