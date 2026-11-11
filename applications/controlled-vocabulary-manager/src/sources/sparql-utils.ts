import type { LanguageString } from "@dataspecer/core/core/core-resource"
import type { SparqlRow, SparqlTerm } from "./sparql-client"

/**
 * Helpers shared by the sources that read vocabularies from a SPARQL endpoint.
 */

/**
 * Rejects an IRI that could not be written inside <...> without changing the query.
 */
export function assertSafeIri(iri: string): void {
  if (iri === "" || /[\u0000- <>"{}|\\^`]/.test(iri)) {
    throw new Error(`Not a usable IRI: ${iri}`)
  }
}

/**
 * The label of an entity that has no name is its IRI.
 */
export function labelOrIri(label: LanguageString, iri: string): LanguageString {
  return Object.keys(label).length > 0 ? label : { "": iri }
}

/**
 * Creates a language string from literals. 
 * The language tag is cut to its primary subtag ("cs-CZ" becomes "cs"), 
 * and a literal whose tag is not a two-letter language code is left out.
 * A literal without a tag is stored under the empty key.
 * Of more literals in one language the one tagged with the bare language code stays, since the others
 * are derived from it (a machine translation is tagged "cs-t-en-t0-mtec"), otherwise the first one.
 */
export function toLanguageString(terms: SparqlTerm[]): LanguageString {
  const result: LanguageString = {}
  const exact = new Set<string>()
  for (const term of terms) {
    const value = term.value.trim()
    const tag = term["xml:lang"] ?? ""
    const language = tag.split("-")[0].toLowerCase()
    if (value === "" || (language !== "" && !/^[a-z]{2}$/.test(language))) {
      continue
    }
    const isExact = tag.toLowerCase() === language
    if (result[language] === undefined || (isExact && !exact.has(language))) {
      result[language] = value
      if (isExact) {
        exact.add(language)
      }
    }
  }
  return result
}

/**
 * Gives the texts without a language tag, stored under the empty key, the language.
 */
export function tagUntagged(text: LanguageString, language: string): LanguageString {
  const { "": untagged, ...tagged } = text
  const tag = language.split("-")[0].toLowerCase()
  return untagged !== undefined && tagged[tag] === undefined ? { ...tagged, [tag]: untagged } : tagged
}

/**
 * The first non-empty value of the variable in the rows, undefined if there is none.
 */
export function firstValue(rows: SparqlRow[], variable: string): string | undefined {
  return rows.map((row) => row[variable]?.value).find((value) => value !== undefined && value !== "")
}

/**
 * The terms the variable is bound to in the rows, the rows where it is not bound are skipped.
 */
export function termsOf(rows: SparqlRow[], variable: string): SparqlTerm[] {
  return rows.map((row) => row[variable]).filter((term): term is SparqlTerm => term !== undefined)
}

/**
 * Compares two texts by their code units, the way a sort key is compared.
 */
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Position of the value in the list, which is in the order from the best to the worst.
 * A value that is not in the list is the last.
 */
export function rankIn(order: readonly string[], value: string): number {
  const index = order.indexOf(value)
  return index === -1 ? order.length : index
}
