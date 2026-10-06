import { Language } from "./language";
import { LanguageString } from "../../shared/types";

export interface LabelSelector {

  /**
   * Active user interface language.
   */
  language: Language;

  /**
   * A constant list of all available languages.
   */
  languages: Language[];

  /**
   * Set user interface language.
   */
  setLanguage: (next: Language) => void;

  /**
   * Return translated version of the given string.
   */
  t(value: string, ...args: unknown[]): string;

  /**
   * @returns String for current language.
   */
  langString(value: LanguageString): string;

}

export function createLabelSelector(): LabelSelector {
  const translations: Record<string, string> = {
    "en": "English",
    "cs": "Čeština",
  };

  return {
    language: "en",
    languages: ["en", "cs"],
    setLanguage(next) {
      // TODO Do something here ..
    },
    t(text, ..._args) {
      // TODO Implement proper translation here!
      return translations[text] ?? text;
    },
    langString(value) {
      return value["cs"] ?? value["en"];
    },
  }
};
