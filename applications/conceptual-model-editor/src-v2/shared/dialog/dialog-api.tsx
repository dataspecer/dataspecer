import type React from "react";

/**
 * Contains information about dialog to be rendered.
 */
export interface DialogWrapper<S> {

  /**
   * Label form dialog header.
   * Value before translation.
   */
  label: string;

  /**
   * Component for rendering the dialog.
   */
  component: React.FunctionComponent<DialogProps<S>>;

  /**
   * Dialog state.
   */
  state: S;

  /**
   * Label for confirm button before translation.
   * Use null to not render the button.
   */
  confirmLabel: string | null;

  /**
   * Label for close button before translation.
   */
  cancelLabel: string;

  /**
   * Optional validation function.
   * Only valid dialog can be confirmed.
   */
  validate: null | ((state: S) => boolean);

  /**
   * Called when user confirmed the dialog.
   */
  onConfirm: null | ((state: S) => void);

  /**
   * Called when dialog is about to be closed without user confirming the action.
   */
  onClose: null | ((state: S) => void);

  /**
   * Used to specify possible class names to style dialog (for example to make it smaller or appear somewhere else).
   * If not given then use the default ones.
   */
  dialogClassNames?: string;

}

/**
 * Properties for the dialog component.
 */
export interface DialogProps<S> {

  /**
   * Dialog state.
   */
  state: S;

  /**
   * Request change of state to a new value.
   */
  changeState: (next: S | ((prevState: S) => S)) => void;

  /**
   * Request dialog to be closed.
   */
  close: () => void;

}
