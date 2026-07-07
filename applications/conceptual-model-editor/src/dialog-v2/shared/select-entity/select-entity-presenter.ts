import { SelectEntityState } from "./select-entity-state";

export function createSelectEntityPresenter(
  setState: (next: (state: SelectEntityState)
    => SelectEntityState) => void,
): SelectEntityPresenter {

  return {
    onChange(value) {
      setState(state => ({
        ...state,
        value: state.items.find(item => item.id === value) ?? null,
      }));
    },
  }

}

export interface SelectEntityPresenter {

  onChange(value: string): void;

}
