import { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";

/**
 * Return a null when given value is null or an empty string,
 * else return the given value.
 */
export function emptyAsNull(value: string | null) : string | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  return value;
}

/**
 * Return a string value to show to the user.
 * When the value does not match the required language add information
 * about the language.
 * If there is no value in the string return empty string.
 */
export function languageStringToString(
  languagePreferences: string[],
  language: string,
  value: LanguageString | null,
): string {
  if (value === null) {
    return "";
  }
  const preferred = value[language];
  if (preferred !== undefined) {
    return preferred;
  }
  for (const key of languagePreferences) {
    const candidate = value[key];
    if (candidate !== undefined) {
      return candidate + ` [${key}]`;
    }
  }
  // Try to use empty string first.
  const candidate = value[""];
  if (candidate !== undefined) {
    return candidate;
  }
  // Just use the first key.
  for (const key in value) {
    return value[key] + ` [${key}]`;
  }
  return "";
}
