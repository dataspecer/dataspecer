import type { LanguageString } from "@dataspecer/core/core/core-resource"
import type { SparqlRow, SparqlTerm } from "../sparql-client"
import type { CandidateFilter, SourceCandidate, SourceGroup } from "../types"

/**
 * Datasets of NKOD declare the standard they conform to with dct:conformsTo.
 * The codelists are the datasets conforming to the open formal norm (OFN) for codelists,
 * in any of its versions, which all start with this IRI.
 */
const OFN_CODELISTS_IRI = "https://ofn.gov.cz/číselníky"

export const PREFIXES = `PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>`

/**
 * Binds ?dataset to every codelist dcat:Datase dataset conforming to the norm and ?publisher to its publisher.
 * The series of codelist versions are left out: they have no distributions
 * of their own, and their versions are listed as codelists themselves.
 */
const CODELIST_DATASETS = `?dataset a dcat:Dataset ;
            dct:conformsTo ?standard ;
            dct:publisher ?publisher .
    FILTER(STRSTARTS(STR(?standard), "${OFN_CODELISTS_IRI}"))
    FILTER NOT EXISTS { ?dataset a dcat:DatasetSeries }`


function assertNonNegativeInteger(value: number, name: string): void {
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
 * Creates a language string from the Czech, the English and the language-less
 * name of a result row. A name that is missing or empty is left out.
 */
function mapNames(cs?: SparqlTerm, en?: SparqlTerm, plain?: SparqlTerm): LanguageString {
  const names: [string, SparqlTerm | undefined][] = [["cs", cs], ["en", en], ["", plain]]
  const result: LanguageString = {}
  for (const [language, name] of names) {
    if (name !== undefined && name.value !== "") {
      result[language] = name.value
    }
  }
  return result
}

/**
 * The label of an entity that has no name is its IRI.
 */
function labelOrIri(label: LanguageString, iri: string): LanguageString {
  return Object.keys(label).length > 0 ? label : { "": iri }
}

/**
 * Lists a page of the publishers of codelists, the biggest first, with the
 * number of their codelists and their names in Czech, English and without a
 * language.
 *
 * There is a subquery so that the names are looked up only for the publishers on the selected page.
 * The names are repeated in the graph of every dataset, so the outer SELECT has to be DISTINCT
 */
export function publishersQuery(limit: number, offset: number): string {
  assertNonNegativeInteger(limit, "limit")
  assertNonNegativeInteger(offset, "offset")
  return `${PREFIXES}
SELECT DISTINCT ?publisher ?count ?nameCs ?nameEn ?namePlain
WHERE {
  {
    SELECT ?publisher (COUNT(DISTINCT ?dataset) AS ?count)
    WHERE {
      ${CODELIST_DATASETS}
    }
    GROUP BY ?publisher
    ORDER BY DESC(?count) ?publisher
    LIMIT ${limit} OFFSET ${offset}
  }
  OPTIONAL { ?publisher foaf:name ?nameCs FILTER(LANG(?nameCs) = "cs") }
  OPTIONAL { ?publisher foaf:name ?nameEn FILTER(LANG(?nameEn) = "en") }
  OPTIONAL { ?publisher foaf:name ?namePlain FILTER(LANG(?namePlain) = "") }
}
ORDER BY DESC(?count) ?publisher`
}

/**
 * Counts the publishers of codelists, the size of the whole listing of
 * {@link publishersQuery}.
 */
export function publisherCountQuery(): string {
  return `${PREFIXES}
SELECT (COUNT(DISTINCT ?publisher) AS ?total)
WHERE {
  ${CODELIST_DATASETS}
}`
}

/**
 * Reads the single number a count query returns in the given variable.
 */
export function readCount(rows: SparqlRow[], variable: string): number {
  const count = Number(rows[0]?.[variable]?.value)
  return Number.isInteger(count) ? count : 0
}

/**
 * Turns the rows of {@link publishersQuery} to groups, in the order of the rows.
 * The rows of one publisher are merged, since a publisher could have more names per langiage.
 * A publisher without any name is labeled by its IRI.
 */
export function mapPublisherRows(rows: SparqlRow[]): SourceGroup[] {
  const groups = new Map<string, SourceGroup>()
  for (const row of rows) {
    const id = row.publisher?.value
    if (id === undefined) {
      continue
    }
    const label = mapNames(row.nameCs, row.nameEn, row.namePlain)
    const group = groups.get(id)
    if (group === undefined) {
      groups.set(id, { id, label, count: readCount([row], "count") })
    } else {
      group.label = { ...label, ...group.label }
    }
  }
  return [...groups.values()].map((group) => ({ ...group, label: labelOrIri(group.label, group.id) }))
}

/**
 * The conditions of the filter on the codelists, as patterns of a query
 * that binds ?dataset and ?publisher.
 */
function candidateConditions(filter: CandidateFilter): string {
  const conditions: string[] = []
  if (filter.groupId !== undefined) {
    assertSafeIri(filter.groupId)
    conditions.push(`VALUES ?publisher { <${filter.groupId}> }`)
  }
  const text = filter.query?.trim()
  if (text) {
    conditions.push(`?dataset dct:title ?matched .
      FILTER(CONTAINS(LCASE(STR(?matched)), LCASE("${escapeSparqlString(text)}")))`)
  }
  return conditions.join("\n      ")
}

/**
 * Lists a page of the codelists that satisfy the filter, ordered by their Czech title,
 * or by another title when they have no Czech one.
 * Each row has the sort key of its codelist in ?sort.
 *
 * As in {@link publishersQuery}, a subquery cuts the page so that the titles
 * and the publisher names are looked up only for the codelists on it.
 * The order of the rows of the outer SELECT is not reliable, which {@link mapCandidateRows} takes care of.
 */
export function candidatesQuery(filter: CandidateFilter, limit: number, offset: number): string {
  assertNonNegativeInteger(limit, "limit")
  assertNonNegativeInteger(offset, "offset")
  return `${PREFIXES}
SELECT DISTINCT ?dataset ?sort ?titleCs ?titleEn ?titlePlain ?publisher ?pubCs ?pubEn ?pubPlain
WHERE {
  {
    SELECT ?dataset ?publisher
           (MIN(IF(LANG(?title) = "cs", LCASE(STR(?title)), CONCAT("~", LCASE(STR(?title))))) AS ?sort)
    WHERE {
      ${CODELIST_DATASETS}
      ?dataset dct:title ?title .
      ${candidateConditions(filter)}
    }
    GROUP BY ?dataset ?publisher
    ORDER BY ?sort ?dataset
    LIMIT ${limit} OFFSET ${offset}
  }
  OPTIONAL { ?dataset dct:title ?titleCs FILTER(LANG(?titleCs) = "cs") }
  OPTIONAL { ?dataset dct:title ?titleEn FILTER(LANG(?titleEn) = "en") }
  OPTIONAL { ?dataset dct:title ?titlePlain FILTER(LANG(?titlePlain) = "") }
  OPTIONAL { ?publisher foaf:name ?pubCs FILTER(LANG(?pubCs) = "cs") }
  OPTIONAL { ?publisher foaf:name ?pubEn FILTER(LANG(?pubEn) = "en") }
  OPTIONAL { ?publisher foaf:name ?pubPlain FILTER(LANG(?pubPlain) = "") }
}`
}

/**
 * Counts the codelists that satisfy the filter, the size of the whole listing
 * of {@link candidatesQuery}.
 */
export function candidateCountQuery(filter: CandidateFilter): string {
  return `${PREFIXES}
SELECT (COUNT(DISTINCT ?dataset) AS ?total)
WHERE {
  ${CODELIST_DATASETS}
  ${candidateConditions(filter)}
}`
}

/**
 * Maps query result. The rows of one codelist are merged, and the candidates are put in the order of the sort key,
 * since the endpoint does not keep the order of a DISTINCT result.
 * A codelist without a title is titled by its IRI.
 */
export function mapCandidateRows(rows: SparqlRow[]): SourceCandidate[] {
  const entries = new Map<string, { sort: string, candidate: SourceCandidate }>()
  for (const row of rows) {
    const id = row.dataset?.value
    if (id === undefined) {
      continue
    }
    const title = mapNames(row.titleCs, row.titleEn, row.titlePlain)
    const groupLabel = mapNames(row.pubCs, row.pubEn, row.pubPlain)
    const entry = entries.get(id)
    if (entry === undefined) {
      entries.set(id, { sort: row.sort?.value ?? "", candidate: { id, title, groupLabel } })
    } else {
      entry.candidate.title = { ...title, ...entry.candidate.title }
      entry.candidate.groupLabel = { ...groupLabel, ...entry.candidate.groupLabel }
    }
  }
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  return [...entries.values()]
    .sort((a, b) => compare(a.sort, b.sort) || compare(a.candidate.id, b.candidate.id))
    .map(({ candidate }) => ({ ...candidate, title: labelOrIri(candidate.title, candidate.id) }))
}
