// Service for AttributeCreateDialog
import { DialogWrapper } from "../../dialog-api";
import { DialogApiContextType } from "../../dialog-service";
import { DialogApiContext } from "../../dialog-context";
import { useContext, useEffect } from "react";
import { AttributeCreateDialog } from "./AttributeCreateDialog";
import { AttributeCreateDialogState, createAttributeCreateDialogState } from "./attribute-create-dialog-state";

/** Opens the AttributeCreateDialog and alerts a JSON representation of the entered data. */
export function openAttributeCreateDialog(dialogs: DialogApiContextType): void {
  const initialState = createAttributeCreateDialogState();

  const onConfirm = (state: AttributeCreateDialogState) => {
    alert(JSON.stringify(state, null, 2));
  };

  const dialog: DialogWrapper<AttributeCreateDialogState> = {
    label: "dialog.attributeCreate.label",
    component: AttributeCreateDialog,
    state: initialState,
    confirmLabel: "dialog.attributeCreate.ok",
    cancelLabel: "dialog.attributeCreate.cancel",
    validate: null,
    onConfirm,
    onClose: null,
  };

  dialogs.openDialog(dialog);
}

/** Hook that registers `window.openAttributeCreateDialog` for console usage. */
export function useRegisterAttributeCreateDialogToWindow(): void {
  const dialogs = useContext(DialogApiContext);

  useEffect(() => {
    if (!dialogs) return;
    (window as any).openAttributeCreateDialog = () => openAttributeCreateDialog(dialogs);
    return () => {
      delete (window as any).openAttributeCreateDialog;
    };
  }, [dialogs]);
}
