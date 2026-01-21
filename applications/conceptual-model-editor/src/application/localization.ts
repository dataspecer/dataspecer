import { createLogger } from "./logging";
import { english, czech, translations } from "./localization-translations";

const LOG = createLogger(import.meta.url);

export type TranslationFunction = (text: string, ...args: unknown[]) => string;

let currentUiLanguage: "en" | "cs" = "en";

export const setUiLanguage = (language: "en" | "cs") => {
  currentUiLanguage = language;
};

export const getUiLanguage = (): "en" | "cs" => {
  return currentUiLanguage;
};

export const t: TranslationFunction = (text, ...args) => {
  const languageTranslations = currentUiLanguage === "cs" ? czech : english;
  const entry = languageTranslations[text];
  if (entry === undefined) {
    // Fallback to English if translation is missing in Czech
    if (currentUiLanguage === "cs") {
      const englishEntry = english[text];
      if (englishEntry !== undefined) {
        return translate(englishEntry, args);
      }
    }
    LOG.missingTranslation(text);
    return text;
  }
  return translate(entry, args);
};

function translate(translation: string | Function, ...args: unknown[]) {
  if (translation instanceof Function) {
    return translation(...args);
  } else {
    return translation;
  }
}

/**
 * Use this translation function for data related labels.
 * Example is the diagram visualisation.
 * Decision made as part of
 * https://github.com/dataspecer/dataspecer/issues/1412 .
 */
export const tData = (
  text: string, language: string, ...args: unknown[]) => {
  const entry = translations[language]?.[text];
  if (entry === undefined) {
    LOG.missingTranslation(language + ":" + text);
    return text;
  }
  return translate(entry, args);
}
