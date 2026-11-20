import { SelectCardinalityState } from "./select-cardinality-state";

export function createSelectCardinalityPresenter(
  setState: (next: (state: SelectCardinalityState)
    => SelectCardinalityState) => void,
): SelectCardinalityPresenter {

  return {
    onChange(value) {
      setState(state => ({ ...state, value }));
    },
  }

}

export interface SelectCardinalityPresenter {

  onChange(value: "0x" | "01" | "1x" | "11"): void;

}
