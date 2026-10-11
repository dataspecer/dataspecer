import { StringInputState } from "../../components/string-input";

/**
 * State for SimpleDialog composed of reusable dialog-components.
 * You can add any number of component states here (e.g. multiple StringInputState, IriInputState, etc.).
 */
export interface SimpleDialogState {
  /** Main string input field */
  name: StringInputState;
  surname: StringInputState;
}

export function createSimpleDialogState(initialValue: string = ""): SimpleDialogState {
  return {
    name: {
      value: initialValue,
    },
    surname:{
      value:initialValue,
    }
  };
}
