import type React from "react";
import { type DialogProps, type DialogWrapper } from "./dialog-api";

import { logger } from "../application";

/**
 * Use this to interaction with dialogs.
 */
export interface DialogApiContextType {

  /**
   * Request new dialog to be open.
   */

  openDialog: (dialog: DialogWrapper<any>) => void;

  /**
   * Close last added dialog, calling the dialog onClose method.
   */
  closeDialog: () => void;

}

/**
 * This should be used only by the dialog renderer component.
 */
export interface DialogRendererContextType<S> {

  label: string;

  canConfirm: boolean;

  confirmLabel: string | null;

  closeLabel: string;

  state: S;

  component: React.FunctionComponent<DialogProps<S>>;

  /**
   * Change state of the last added dialog.
   */
  changeState: (next: S | ((prevState: S) => S)) => void;

  /**
   * True while an asynchronous {@link DialogWrapper.onConfirm} runs.
   * Confirm and close are ignored in the meantime.
   */
  pending: boolean;

  confirm: () => void;

  close: () => void;

  /**
   * Used to specify possible class names to style dialog (for example to make it smaller or appear somewhere else).
   * If not given then use the default ones.
   */
  dialogClassNames?: string;
}

/**
 * Dialog in the stack of open dialogs.
 */
interface OpenDialog<S> extends DialogWrapper<S> {

  /**
   * Stays the same while the dialog is open, even when the state changes.
   * Used to find the dialog after an asynchronous confirm.
   */
  identifier: number;

  pending: boolean;

}

/**
 * Hold context internal data.
 * Here we use any as a type for generic as we can have different
 * types for different dialogs. As a result we need to disable
 * @typescript-eslint/no-unsafe-assignment down in the file where
 * we cast from a generic to any and back.
 */
interface State {

  dialogs: OpenDialog<any>[];

}

export const createInitialDialogContextStateType = (): State => {
  return {
    dialogs: [],
  };
};

let nextDialogIdentifier = 0;

/**
 * Identifiers of dialogs whose confirm was called.
 * The pending flag in the state is visible only after the next render,
 * this guards against a second click before that.
 */
const confirmedDialogs = new Set<number>();

export const createDialogApiContext = (setState: React.Dispatch<React.SetStateAction<State>>): DialogApiContextType => {

  const openDialog = (dialog: DialogWrapper<any>) => {
    const open: OpenDialog<any> = {
      ...dialog,
      identifier: ++nextDialogIdentifier,
      pending: false,
    };
    setState(previous => ({ ...previous, dialogs: [...previous.dialogs, open] }));
  };

  const closeDialog = () => {
    setState(previous => {
      const dialogs = previous.dialogs;
      const last = dialogs.at(-1);
      if (last === undefined) {
        return previous;
      }
      if (last.onClose !== null) {
        last.onClose(last.state);
      }
      return {
        ...previous,
        dialogs: previous.dialogs.slice(0, previous.dialogs.length - 1),
      };
    });
  };

  return {
    openDialog,
    closeDialog,
  };
};

export const createDialogRendererContext = <S>(
  state: State,
  setState: React.Dispatch<React.SetStateAction<State>>,
): DialogRendererContextType<S> | null => {
  const dialog = state.dialogs.at(-1) as OpenDialog<S> | undefined;
  if (dialog === undefined) {
    return null;
  }

  // We use function as otherwise the <S> is detected as start of JSX.
  const changeState = (next: S | ((prevState: S) => S)) => {
    setState((previous) => updateDialog(previous, dialog.identifier, item => {
      if (typeof next === "function") {
        // Little help for TypeScript here.
        const setter: (prevState: S) => S = next as any;
        return { ...item, state: setter(item.state) };
      } else {
        return { ...item, state: next };
      }
    }));
  };

  const remove = () => {
    setState(previous => {
      confirmedDialogs.delete(dialog.identifier);
      return {
        ...previous,
        dialogs: previous.dialogs.filter(item => item.identifier !== dialog.identifier),
      };
    });
  };

  const confirm = () => {
    if (confirmedDialogs.has(dialog.identifier)) {
      return;
    }
    confirmedDialogs.add(dialog.identifier);
    let result: void | Promise<void>;
    try {
      result = dialog.onConfirm?.(dialog.state);
    } catch (error) {
      // Synchronous failure keeps the dialog open, as before.
      confirmedDialogs.delete(dialog.identifier);
      throw error;
    }
    if (!(result instanceof Promise)) {
      remove();
      return;
    }
    // Wait for the confirm to finish, then close the dialog.
    setState(previous => updateDialog(previous, dialog.identifier,
      item => ({ ...item, pending: true })));
    result
      // We close the dialog even when the confirm fails,
      // see "2026-11-22-dialog-backlog.md".
      .catch(error => logger.error("Dialog confirm failed.", { error }))
      .finally(remove);
  };

  const close = () => {
    if (confirmedDialogs.has(dialog.identifier)) {
      return;
    }
    if (dialog.onClose !== null) {
      dialog.onClose(dialog.state);
    }
    remove();
  };

  return {
    label: dialog.label,
    canConfirm: dialog.validate?.(dialog.state) ?? true,
    confirmLabel: dialog.confirmLabel,
    closeLabel: dialog.cancelLabel,
    state: dialog.state,
    component: dialog.component,
    changeState,
    pending: dialog.pending,
    confirm,
    close,
    dialogClassNames: dialog.dialogClassNames
  };
};

/**
 * Replace dialog with given identifier, do nothing when it is not open.
 */
function updateDialog(
  state: State,
  identifier: number,
  update: (dialog: OpenDialog<any>) => OpenDialog<any>,
): State {
  const index = state.dialogs.findIndex(item => item.identifier === identifier);
  if (index === -1) {
    logger.error("An attempt was made to change a dialog which is not open.");
    return state;
  }
  const dialogs = [...state.dialogs];
  dialogs[index] = update(dialogs[index]);
  return { ...state, dialogs };
}
