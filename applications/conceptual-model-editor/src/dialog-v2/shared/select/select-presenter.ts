import { SelectState } from "./select-state";

export function createSelectPresenter(
  setState: (next: (state: SelectState)
    => SelectState) => void,
): SelectPresenter {

  return {
    onChange(value) {
      setState(state => ({
        ...state,
        value: state.items.find(item => item.id === value) ?? null,
      }));
    },
  }

}

export interface SelectPresenter {

  onChange(value: string): void;

}
