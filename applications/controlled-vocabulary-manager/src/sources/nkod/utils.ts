import type { LanguageString } from "@dataspecer/core/core/core-resource"
import type { SparqlTerm } from "../sparql-client"

/**
 * Creates a language string from literals. The language tag is cut to its
 * primary subtag ("cs-CZ" becomes "cs"), and a literal whose tag is not a
 * two-letter language code is left out. A literal without a tag is stored
 * under the empty key. Of more literals in one language the first one stays.
 */
export function toLanguageString(terms: SparqlTerm[]): LanguageString {
  const result: LanguageString = {}
  for (const term of terms) {
    const value = term.value.trim()
    const tag = term["xml:lang"] ?? ""
    const language = tag.split("-")[0].toLowerCase()
    if (value === "" || (language !== "" && !/^[a-z]{2}$/.test(language))) {
      continue
    }
    if (result[language] === undefined) {
      result[language] = value
    }
  }
  return result
}
