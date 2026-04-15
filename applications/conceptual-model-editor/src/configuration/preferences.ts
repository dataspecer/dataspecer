
/**
 * Runtime preferences that can be changed by the user.
 * Unlike options, they are not provided using React context.
 *
 * As a result, the should not be used to long-time living UI,
 * where change on one place in the application can trigger change in other
 * part of the application.
 *
 * The preferences are saved using sessionStorage.
 */
export interface Preferences {

  /**
   * Value to be used for the catalog and editor splitter.
   */
  pageSplitterValue: number;

  /**
   * Catalog component.
   */
  catalogComponent: "v1" | "v2" | "v3";

}

const PREFERENCES_KEY = "dataspecer-cme-preferences";

const DEFAULT_PREFERENCES: Preferences = Object.freeze({
  pageSplitterValue: 25,
  catalogComponent: "v2",
});

let activePreferences: Preferences = (() => {
  return {
    ...DEFAULT_PREFERENCES,
    ...JSON.parse(sessionStorage.getItem(PREFERENCES_KEY)?? "{}"),
  };
})();

export const preferences = ()  => activePreferences;

export const updatePreferences = (next: Partial<Preferences>) => {
  activePreferences = {
    ...activePreferences,
    ...next,
  };
  sessionStorage.setItem(PREFERENCES_KEY, JSON.stringify(activePreferences));
};
