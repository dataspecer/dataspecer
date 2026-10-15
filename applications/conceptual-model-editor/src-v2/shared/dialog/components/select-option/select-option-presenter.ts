import { SelectOptionState } from "./select-option-state";

export function createSelectOptionPresenter(
  setState: (next: (state: SelectOptionState)
    => SelectOptionState) => void,
): SelectOptionPresenter {

  return {
    onChange(value) {
      setState(state => ({ ...state, value }));
    },
  }

}

export interface SelectOptionPresenter {

  onChange(value: string): void;

}
