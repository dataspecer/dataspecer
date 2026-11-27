// Service for AttributeProfileCreateDialog
import { useContext, useEffect } from "react";
import { DialogWrapper } from "../../dialog-api";
import { DialogApiContextType } from "../../dialog-service";
import { DialogApiContext } from "../../dialog-context";
import { AttributeProfileCreateDialog } from "./AttributeProfileCreateDialog";
import {
  AttributeProfileCreateDialogState,
  createAttributeProfileCreateDialogState,
} from "./attribute-profile-create-dialog-state";

/** Opens the AttributeProfileCreateDialog and alerts JSON of the state */
export function openAttributeProfileCreateDialog(dialogs: DialogApiContextType): void {
  const initialState = createAttributeProfileCreateDialogState();
  const onConfirm = (state: AttributeProfileCreateDialogState) => {
    alert(JSON.stringify(state, null, 2));
  };
  const dialog: DialogWrapper<AttributeProfileCreateDialogState> = {
    label: "dialog.attributeProfileCreate.label",
    component: AttributeProfileCreateDialog,
    state: initialState,
    confirmLabel: "dialog.attributeProfileCreate.ok",
    cancelLabel: "dialog.attributeProfileCreate.cancel",
    validate: null,
    onConfirm,
    onClose: null,
  };
  dialogs.openDialog(dialog);
}

/** Hook to register window.openAttributeProfileCreateDialog */
export function useRegisterAttributeProfileCreateDialogToWindow(): void {
  const dialogs = useContext(DialogApiContext);
  useEffect(() => {
    if (!dialogs) return;
    (window as any).openAttributeProfileCreateDialog = () => openAttributeProfileCreateDialog(dialogs);
    return () => {
      delete (window as any).openAttributeProfileCreateDialog;
    };
  }, [dialogs]);
}
