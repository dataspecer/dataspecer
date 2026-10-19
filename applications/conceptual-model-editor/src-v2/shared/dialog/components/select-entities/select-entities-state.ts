import { SelectEntityState } from "../select-entity";

export interface SelectEntitiesState {

  value: SelectEntitiesItem[];

  items: SelectEntitiesItem[];

  isSelectOpen: boolean;

  /**
   * State for new entity selector.
   */
  selectEntity: SelectEntityState;

}

export interface SelectEntitiesItem {

  id: string;

  /**
   * Entity label to be shown to the user.
   */
  label: string;

}

export function createSelectEntitiesState(
  items: SelectEntitiesItem[],
  value: SelectEntitiesItem[],
): SelectEntitiesState {
  return {
    value,
    items,
    isSelectOpen: false,
    selectEntity: {
      value: null,
      items: items.filter(item => !value.includes(item)),
    }
  };
}
