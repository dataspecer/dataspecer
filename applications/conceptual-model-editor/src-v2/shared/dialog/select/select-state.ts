
export interface SelectState {

  value: SelectItem | null;

  items: SelectItem[];

}

export interface SelectItem {

  id: string;

  /**
   * Label to be translated and show to the user.
   */
  label: string;

}
