import { createLogger } from "./logging";
import { english, translations } from "./localization-translations";

const LOG = createLogger(import.meta.url);

export type TranslationFunction = (text: string, ...args: unknown[]) => string;

export const t: TranslationFunction = (text, ...args) => {
  const entry = english[text];
  if (entry === undefined) {
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
