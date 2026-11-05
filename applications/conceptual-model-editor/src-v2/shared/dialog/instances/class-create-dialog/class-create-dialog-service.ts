// Service for ClassCreateDialog
import { DialogWrapper } from "../../dialog-api";
import { DialogApiContextType } from "../../dialog-service";
import { DialogApiContext } from "../../dialog-context";
import { useContext, useEffect } from "react";
import { ClassCreateDialog } from "./ClassCreateDialog";
import { ClassCreateDialogState, createClassCreateDialogState } from "./class-create-dialog-state";

/** Opens the ClassCreateDialog and alerts a JSON representation of the entered data. */
export function openClassCreateDialog(dialogs: DialogApiContextType): void {
  const initialState = createClassCreateDialogState();

  const onConfirm = (state: ClassCreateDialogState) => {
    alert(JSON.stringify(state, null, 2));
  };

  const dialog: DialogWrapper<ClassCreateDialogState> = {
    label: "dialog.classCreate.label",
    component: ClassCreateDialog,
    state: initialState,
    confirmLabel: "dialog.classCreate.ok",
    cancelLabel: "dialog.classCreate.cancel",
    validate: null,
    onConfirm,
    onClose: null,
  };

  dialogs.openDialog(dialog);
}

/** Hook that registers `window.openClassCreateDialog` for console usage. */
export function useRegisterClassCreateDialogToWindow(): void {
  const dialogs = useContext(DialogApiContext);

  useEffect(() => {
    if (!dialogs) return;
    (window as any).openClassCreateDialog = () => openClassCreateDialog(dialogs);
    return () => {
      delete (window as any).openClassCreateDialog;
    };
  }, [dialogs]);
}
