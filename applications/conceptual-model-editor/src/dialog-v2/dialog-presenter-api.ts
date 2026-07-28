
/**
 * Properties for the dialog component.
 */
export interface DialogProperties<StateType> {

  /**
   * Current state of the dialog.
   */
  state: StateType;

  /**
   * Request change of state to a new value.
   */
  setState: (next: (prevState: StateType) => StateType) => void;

}

