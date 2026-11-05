// Service for ClassProfileCreateDialog
import { DialogWrapper } from "../../dialog-api";
import { DialogApiContextType } from "../../dialog-service";
import { DialogApiContext } from "../../dialog-context";
import { useContext, useEffect } from "react";
import { ClassProfileCreateDialog } from "./ClassProfileCreateDialog";
import { ClassProfileCreateDialogState, createClassProfileCreateDialogState } from "./class-profile-create-dialog-state";

/**
 * Opens the ClassProfileCreateDialog and alerts a JSON representation of the entered data.
 */
export function openClassProfileCreateDialog(dialogs: DialogApiContextType): void {
  const initialState = createClassProfileCreateDialogState();

  const onConfirm = (state: ClassProfileCreateDialogState) => {
    // Show the entire dialog state as pretty‑printed JSON.
    alert(JSON.stringify(state, null, 2));
  };

  const dialog: DialogWrapper<ClassProfileCreateDialogState> = {
    label: "dialog.classProfileCreate.label",
    component: ClassProfileCreateDialog,
    state: initialState,
    confirmLabel: "dialog.classProfileCreate.ok",
    cancelLabel: "dialog.classProfileCreate.cancel",
    validate: null,
    onConfirm,
    onClose: null,
  };

  dialogs.openDialog(dialog);
}

/** Hook that registers `window.openClassProfileCreateDialog` for console usage. */
export function useRegisterClassProfileCreateDialogToWindow(): void {
  const dialogs = useContext(DialogApiContext);

  useEffect(() => {
    if (!dialogs) return;
    (window as any).openClassProfileCreateDialog = () => openClassProfileCreateDialog(dialogs);
    return () => {
      delete (window as any).openClassProfileCreateDialog;
    };
  }, [dialogs]);
}
