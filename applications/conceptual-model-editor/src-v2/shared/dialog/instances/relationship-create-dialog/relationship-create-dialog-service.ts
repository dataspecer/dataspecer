// Service for RelationshipCreateDialog
import { DialogWrapper } from "../../dialog-api";
import { DialogApiContextType } from "../../dialog-service";
import { DialogApiContext } from "../../dialog-context";
import { useContext, useEffect } from "react";
import { RelationshipCreateDialog } from "./RelationshipCreateDialog";
import { RelationshipCreateDialogState, createRelationshipCreateDialogState } from "./relationship-create-dialog-state";

/** Opens the RelationshipCreateDialog and alerts a JSON representation of the entered data. */
export function openRelationshipCreateDialog(dialogs: DialogApiContextType): void {
  const initialState = createRelationshipCreateDialogState();

  const onConfirm = (state: RelationshipCreateDialogState) => {
    alert(JSON.stringify(state, null, 2));
  };

  const dialog: DialogWrapper<RelationshipCreateDialogState> = {
    label: "dialog.relationshipCreate.label",
    component: RelationshipCreateDialog,
    state: initialState,
    confirmLabel: "dialog.relationshipCreate.ok",
    cancelLabel: "dialog.relationshipCreate.cancel",
    validate: null,
    onConfirm,
    onClose: null,
  };

  dialogs.openDialog(dialog);
}

/** Hook that registers `window.openRelationshipCreateDialog` for console usage. */
export function useRegisterRelationshipCreateDialogToWindow(): void {
  const dialogs = useContext(DialogApiContext);

  useEffect(() => {
    if (!dialogs) return;
    (window as any).openRelationshipCreateDialog = () => openRelationshipCreateDialog(dialogs);
    return () => {
      delete (window as any).openRelationshipCreateDialog;
    };
  }, [dialogs]);
}
