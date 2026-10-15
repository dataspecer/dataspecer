import { useContext, useEffect } from "react";
import { DialogWrapper } from "../../dialog-api";
import { DialogApiContextType } from "../../dialog-service";
import { DialogApiContext } from "../../dialog-context";
import { SimpleDialog } from "./SimpleDialog";
import { createSimpleDialogState, SimpleDialogState } from "./simple-dialog-state";

/**
 * Creates and opens a SimpleDialog via the provided DialogApiContextType.
 * Follows the same factory pattern used by v1 dialogs.
 */
export function openSimpleDialog(dialogs: DialogApiContextType): void {
  const initialState = createSimpleDialogState();

  const onConfirm = (state: SimpleDialogState) => {
    // Show the entered string from the StringInput component via a browser alert.
    const name = state?.name?.value ?? (state as any)?.value ?? "";
    const surname = state?.surname?.value ?? (state as any)?.value ?? "";
    alert("Hello  " + name + surname);
  };

  const dialog: DialogWrapper<SimpleDialogState> = {
    label: "dialog.simple.label",
    component: SimpleDialog,
    state: initialState,
    confirmLabel: "dialog.simple.ok",
    cancelLabel: "dialog.simple.cancel",
    validate: null,
    onConfirm,
    onClose: null,
  };

  dialogs.openDialog(dialog);
}

/**
 * React hook that exposes openSimpleDialog on window.openSimpleDialog so it
 * can be invoked directly from the browser console.
 */
export function useRegisterSimpleDialogToWindow(): void {
  const dialogs = useContext(DialogApiContext);

  useEffect(() => {
    if (dialogs === null) {
      return;
    }
    // Attach to window so it can be called from the browser console.
    (window as any).openSimpleDialog = () => openSimpleDialog(dialogs);

    return () => {
      delete (window as any).openSimpleDialog;
    };
  }, [dialogs]);
}
