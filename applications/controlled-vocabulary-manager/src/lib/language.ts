import type { LanguageString } from "@dataspecer/core/core/core-resource"
import { getTranslation } from "@dataspecer/core-v2/utils/language"

/**
 * Language tag of the interface, without the region ("en-US" -> "en").
 */
export function baseLanguage(language: string | undefined): string {
  return language?.split("-")[0] || "en"
}

/**
 * Picks the name in the given language, or in any other language when there is no name in it.
 */
export function selectName(name: LanguageString, language: string): string {
  return getTranslation(name, [baseLanguage(language), "en"]).translation
}
