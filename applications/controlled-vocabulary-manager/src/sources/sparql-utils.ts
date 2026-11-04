import type { LanguageString } from "@dataspecer/core/core/core-resource"
import type { SparqlRow, SparqlTerm } from "./sparql-client"

/**
 * Helpers shared by the sources that read vocabularies from a SPARQL endpoint.
 */

/**
 * Rejects a number that could not be written into a query as a LIMIT or an OFFSET.
 */
export function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer, got ${value}.`)
  }
}

/**
 * Makes the text usable inside a double-quoted SPARQL string literal.
 */
export function escapeSparqlString(text: string): string {
  const escapes: Record<string, string> = { "\\": "\\\\", '"': '\\"', "\n": "\\n", "\r": "\\r", "\t": "\\t" }
  return text.replace(/[\\"\n\r\t]/g, (character) => escapes[character])
}

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
 * Reads the single number a count query returns in the given variable.
 */
export function readCount(rows: SparqlRow[], variable: string): number {
  const count = Number(rows[0]?.[variable]?.value)
  return Number.isInteger(count) ? count : 0
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
