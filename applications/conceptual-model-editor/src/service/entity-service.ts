import {
  isSemanticModelClass,
  isSemanticModelGeneralization,
  isSemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";

import {
  type LanguageString,
  type SemanticModelClass,
} from "@dataspecer/core-v2/semantic-model/concepts";

import { getDomainAndRange } from "../util/relationship-utils";

import { configuration, t } from "../application/";

type GetEntityLabelType = SemanticModelClass;

/**
 * Given an entity returns a human readable label.
 *
 * While it may not look like it getting the label is not an easy task.
 * We not only need to deal with the language but also with the type of
 * entity.
 */
export function getEntityLabel(entity: GetEntityLabelType | null, language: string): string {
  if (entity === null) {
    return "";
  }
  // We serve the special case first, for this one we
  // ignore the language.
  if (isSemanticModelGeneralization(entity)) {
    return t("generalization-label", entity.child, entity.parent);
  }
  let name: LanguageString | null = null;
  if (isSemanticModelClass(entity)) {
    // This one is easy, we just use the name.
    name = entity.name;
  } else if (isSemanticModelRelationship(entity)) {
    // For relationship we need to read data from range.
    name = (getDomainAndRange(entity).range as any)?.name ?? null;
  }

  if (name === null) {
    return "";
  }

  return languageStringToHumanReadable(name, language, configuration().languagePreferences) ?? "";
}

/**
 * If value contains preferred language return the value.
 *
 * If not return value with language tag for first preferred available language or any language.
 */
function languageStringToHumanReadable(
  value: LanguageString,
  language: string,
  languagePreferences: string[],
): string | null {
  let result = value[language];
  if (result !== undefined) {
    return result;
  }

  // Preferences.
  for (const preferredLanguage of languagePreferences) {
    result = value[language];
    if (result === undefined) {
      continue;
    }
    return `${result}@${preferredLanguage}`;
  }

  // Anything.
  for (const entry of Object.entries(value)) {
    return `${entry[1]}@${entry[0]}`;
  }

  return null;
}
