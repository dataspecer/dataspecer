
export interface LanguageStringInputState {

  /**
   * Null when no language is selected or when no language is available.
   */
  active: number | null;

  defaultLanguage: string;

  values: {

    language: string;

    value: string;

  }[];

}
