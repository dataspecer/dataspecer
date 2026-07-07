
export interface SelectEntityState {

  value: SelectEntityItem | null;

  items: SelectEntityItem[];

}

export interface SelectEntityItem {

  id: string;

  /**
   * Entity label to be shown to the user.
   */
  label: string;

}
