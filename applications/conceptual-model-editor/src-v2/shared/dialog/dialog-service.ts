import type React from "react";
import { type DialogProps, type DialogWrapper } from "./dialog-api";

import { logger } from "../../../src/application";

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

  confirm: () => void;

  close: () => void;

  /**
   * Used to specify possible class names to style dialog (for example to make it smaller or appear somewhere else).
   * If not given then use the default ones.
   */
  dialogClassNames?: string;
}

/**
 * Hold context internal data.
 * Here we use any as a type for generic as we can have different
 * types for different dialogs. As a result we need to disable
 * @typescript-eslint/no-unsafe-assignment down in the file where
 * we cast from a generic to any and back.
 */
interface State {

  dialogs: DialogWrapper<any>[];

}

export const createInitialDialogContextStateType = (): State => {
  return {
    dialogs: [],
  };
};

export const createDialogApiContext = (setState: React.Dispatch<React.SetStateAction<State>>): DialogApiContextType => {

  const openDialog = (dialog: DialogWrapper<any>) => {
    setState(previous => ({ ...previous, dialogs: [...previous.dialogs, dialog] }));
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
  const dialog = state.dialogs.at(-1);
  if (dialog === undefined) {
    return null;
  }

  // We use function as otherwise the <S> is detected as start of JSX.
  const changeState = (next: S | ((prevState: S) => S)) => {
    setState((previous) => {
      // We grab the last dialog we are working with.
      let dialog = previous.dialogs.at(-1);
      if (dialog === undefined) {
        logger.error("An attempt was made to change state of dialog, when no dialog is open.");
        return previous;
      }
      if (typeof next === "function") {
        // Little help for TypeScript here.
        const setter: (prevState: S) => S = next as any;
        dialog = { ...dialog, state: setter(dialog.state) };
      } else {
        dialog = { ...dialog, state: next };
      }
      return { ...state, dialogs: [...state.dialogs.slice(0, state.dialogs.length - 1), dialog] };
    });
  };

  const confirm = () => {
    if (dialog.onConfirm !== null) {
      dialog.onConfirm(dialog.state);
    }
    setState({ ...state, dialogs: state.dialogs.slice(0, state.dialogs.length - 1) });
  };

  const close = () => {
    if (dialog.onClose !== null) {
      dialog.onClose(dialog.state);
    }
    setState({ ...state, dialogs: state.dialogs.slice(0, state.dialogs.length - 1) });
  };

  return {
    label: dialog.label,
    canConfirm: dialog.validate?.(dialog.state) ?? true,
    confirmLabel: dialog.confirmLabel,
    closeLabel: dialog.cancelLabel,
    state: dialog.state,
    component: dialog.component,
    changeState,
    confirm,
    close,
    dialogClassNames: dialog.dialogClassNames
  };
};
