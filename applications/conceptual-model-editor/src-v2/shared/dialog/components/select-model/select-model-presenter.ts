import { SelectModelState, SelectModelItem } from "./select-model-state";

export function createSelectModelPresenter(
  setState: (next: (state: SelectModelState)
    => SelectModelState) => void,
): SelectModelPresenter {

  return {
    onChange(value) {
      setState(state => ({ ...state, value }));
    },
  }

}

export interface SelectModelPresenter {

  onChange(value: SelectModelItem): void;

}
