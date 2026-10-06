
export interface SelectState {

  value: SelectItem | null;

  items: SelectItem[];

}

export interface SelectItem {

  id: string;

  /**
   * Display-ready label shown to the user (already localized by the caller).
   */
  label: string;

}
