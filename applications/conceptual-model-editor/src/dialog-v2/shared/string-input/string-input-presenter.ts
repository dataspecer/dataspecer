import { StringInputState } from "./string-input-state";

export function createStringInputPresenter(
  setState: (next: (state: StringInputState)
    => StringInputState) => void,
): StringInputPresenter {

  return {
    onChange(value) {
      setState(state => ({ ...state, value }));
    },
  }

}

export interface StringInputPresenter {

  onChange(value: string): void;

}
