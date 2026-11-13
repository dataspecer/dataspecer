import { SelectEntityPresenter } from "../select-entity";
import { SelectEntitiesItem, SelectEntitiesState } from "./select-entities-state";

export function createSelectEntitiesPresenter(
  setState: (next: (state: SelectEntitiesState)
    => SelectEntitiesState) => void,
): SelectEntitiesPresenter {
  return {
    onChange(value) {
      setState(state => ({
        ...state,
        selectEntity: {
          ...state.selectEntity,
          value: state.selectEntity.items.find(item => item.id === value) ?? null,
        }
      }));
    },
    onOpenSelect: () => {
      setState(state => ({ ...state, isSelectOpen: true }));
    },
    onCloseSelect() {
      setState(state => ({ ...state, isSelectOpen: false }));
    },
    onAdd() {
      setState(state => {
        const selectEntity = state.selectEntity;
        if (selectEntity.value === null) {
          return state;
        }
        const index = selectEntity.items.indexOf(selectEntity.value);
        if (index === -1) {
          return state;
        }
        return {
          ...state,
          isSelectOpen: false,
          value: [...state.value, selectEntity.value],
          selectEntity: {
            value: null,
            items: [
              ...selectEntity.items.slice(0, index),
              ...selectEntity.items.slice(index + 1),
            ]
          }
        }
      });
    },
    onRemove(value) {
      setState(state => {
        const index = state.value.indexOf(value);
        if (index === -1) {
          return state;
        }
        const nextValue = [
          ...state.value.slice(0, index),
          ...state.value.slice(index + 1)
        ];
        return {
          ...state,
          value: nextValue,
          selectEntity: {
            ...state.selectEntity,
            items: state.items.filter(item => !nextValue.includes(item)),
          },
        }
      });
    },
  };
}

export interface SelectEntitiesPresenter extends SelectEntityPresenter {

  onOpenSelect(): void;

  onCloseSelect(): void;

  onAdd(): void;

  onRemove(value: SelectEntitiesItem): void;

}
