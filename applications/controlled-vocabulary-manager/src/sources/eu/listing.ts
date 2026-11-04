import type { SparqlRow, SparqlTerm } from "../sparql-client"
import {
  assertNonNegativeInteger,
  assertSafeIri,
  escapeSparqlString,
  labelOrIri,
  readCount,
  toLanguageString,
} from "../sparql-utils"
import type { CandidateFilter, SourceCandidate, SourceGroup } from "../types"

/**
 * The Reference Data Catalogue of EU Vocabularies, as published on data.europa.eu.
 */
export const EU_CATALOGUE_IRI = "http://data.europa.eu/88u/catalogue/publ"

export const DATASET_TYPE_IRI = "http://publications.europa.eu/resource/authority/dataset-type/"

/**
 * Types of the datasets of the catalogue that are vocabularies with values:
 * named authority lists, code lists, taxonomies and thesauri.
 * The other datasets, such as application profiles or environmental data, are left out.
 */
export const VOCABULARY_TYPES = ["NAL", "CODE_LIST", "TAXONOMY", "THESAURUS"] as const

/**
 * The type of a dataset that is a named authority list, whose values have IRIs derived from the IRI of the list.
 */
export const NAMED_AUTHORITY_LIST = "NAL"

export const PREFIXES = `PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>`

/**
 * Binds ?dataset to every vocabulary of the catalogue, ?type to its type and ?group to the body the vocabulary is grouped under.
 * That is its creator, or its publisher when it has no creator.
 */
const VOCABULARY_DATASETS = `<${EU_CATALOGUE_IRI}> dcat:dataset ?dataset .
    ?dataset a dcat:Dataset ;
             dct:type ?type ;
             dct:publisher ?publisher .
    VALUES ?type { ${VOCABULARY_TYPES.map((type) => `<${DATASET_TYPE_IRI}${type}>`).join(" ")} }
    OPTIONAL { ?dataset dct:creator ?creator FILTER(isIRI(?creator)) }
    BIND(COALESCE(?creator, ?publisher) AS ?group)`

/**
 * Lists a page of the bodies that the vocabularies are grouped under, the biggest first, with the number of
 * their vocabularies and their names in Czech and English.
 *
 * A subquery cuts the page so that the names are looked up only for the groups on it.
 * The name is asked for with a single pattern, as in the listing of candidates.
 */
export function groupsQuery(limit: number, offset: number): string {
  assertNonNegativeInteger(limit, "limit")
  assertNonNegativeInteger(offset, "offset")
  return `${PREFIXES}
SELECT DISTINCT ?group ?count ?name
WHERE {
  {
    SELECT ?group (COUNT(DISTINCT ?dataset) AS ?count)
    WHERE {
      ${VOCABULARY_DATASETS}
    }
    GROUP BY ?group
    ORDER BY DESC(?count) ?group
    LIMIT ${limit} OFFSET ${offset}
  }
  OPTIONAL { ?group skos:prefLabel ?name }
}`
}

/**
 * Counts the groups, the size of the whole listing of {@link groupsQuery}.
 */
export function groupCountQuery(): string {
  return `${PREFIXES}
SELECT (COUNT(DISTINCT ?group) AS ?total)
WHERE {
  ${VOCABULARY_DATASETS}
}`
}

/**
 * Collects the terms of a result column per entity, in the order the entities first appear in.
 */
function collectTerms(rows: SparqlRow[], idColumn: string, termColumn: string): Map<string, SparqlTerm[]> {
  const terms = new Map<string, SparqlTerm[]>()
  for (const row of rows) {
    const id = row[idColumn]?.value
    if (id === undefined) {
      continue
    }
    const entityTerms = terms.get(id) ?? []
    terms.set(id, entityTerms)
    if (row[termColumn] !== undefined) {
      entityTerms.push(row[termColumn])
    }
  }
  return terms
}

/**
 * Turns the rows of {@link groupsQuery} to groups, in the order of the rows.
 * The rows of one group are merged, since the group has a name per language.
 * A group without any name is labeled by its IRI.
 */
export function mapGroupRows(rows: SparqlRow[]): SourceGroup[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (row.group !== undefined && !counts.has(row.group.value)) {
      counts.set(row.group.value, readCount([row], "count"))
    }
  }
  return [...collectTerms(rows, "group", "name")].map(([id, names]) => ({
    id,
    count: counts.get(id) ?? 0,
    label: labelOrIri(toLanguageString(names), id),
  }))
}

/**
 * The text of the filter as a string literal for a comparison with a lower-cased title, null for no text.
 */
function searchLiteral(filter: CandidateFilter): string | null {
  const text = filter.query?.trim()
  return text ? `LCASE("${escapeSparqlString(text)}")` : null
}

/**
 * The condition on the group of the filter, as a pattern of a query that binds ?group, empty for no group.
 */
function groupCondition(filter: CandidateFilter): string {
  if (filter.groupId === undefined) {
    return ""
  }
  assertSafeIri(filter.groupId)
  return `FILTER(?group = <${filter.groupId}>)`
}

/**
 * Lists a page of the vocabularies that satisfy the filter, ordered by their English title,
 * or by another title when they have no English one. The text is searched in the titles in all languages.
 * Each row has the sort key of its vocabulary in ?sort.
 *
 * As in {@link groupsQuery}, a subquery cuts the page so that the titles are looked up only for the vocabularies on it.
 * Each row has the group of its vocabulary in ?group, but not its name, which is in all the
 * languages and would multiply the rows of the titles. The names come from {@link groupsQuery}.
 * The order of the rows of the outer SELECT is not reliable, which {@link mapCandidateRows} takes care of.
 */
export function candidatesQuery(filter: CandidateFilter, limit: number, offset: number): string {
  assertNonNegativeInteger(limit, "limit")
  assertNonNegativeInteger(offset, "offset")
  const search = searchLiteral(filter)
  const having = search === null ? "" : `HAVING (SUM(IF(CONTAINS(LCASE(STR(?sortTitle)), ${search}), 1, 0)) > 0)`
  return `${PREFIXES}
SELECT DISTINCT ?dataset ?sort ?title ?group
WHERE {
  {
    SELECT ?dataset ?group
           (MIN(IF(LANG(?sortTitle) = "en", LCASE(STR(?sortTitle)), CONCAT("~", LCASE(STR(?sortTitle))))) AS ?sort)
    WHERE {
      ${VOCABULARY_DATASETS}
      ?dataset dct:title ?sortTitle .
      ${groupCondition(filter)}
    }
    GROUP BY ?dataset ?group
    ${having}
    ORDER BY ?sort ?dataset
    LIMIT ${limit} OFFSET ${offset}
  }
  OPTIONAL { ?dataset dct:title ?title }
}`
}

/**
 * Counts the vocabularies that satisfy the filter, the size of the whole listing
 * of {@link candidatesQuery}.
 */
export function candidateCountQuery(filter: CandidateFilter): string {
  const search = searchLiteral(filter)
  const match = search === null ? "" : `?dataset dct:title ?matched .
  FILTER(CONTAINS(LCASE(STR(?matched)), ${search}))`
  return `${PREFIXES}
SELECT (COUNT(DISTINCT ?dataset) AS ?total)
WHERE {
  ${VOCABULARY_DATASETS}
  ${groupCondition(filter)}
  ${match}
}`
}

/**
 * Maps the rows of {@link candidatesQuery}. The rows of one vocabulary are merged, and the candidates are
 * put in the order of the sort key, since the endpoint does not keep the order of a DISTINCT result.
 * A vocabulary without a title is titled by its IRI.
 * The label of the group of a vocabulary is taken from `groups`, empty if the group is not among them.
 */
export function mapCandidateRows(rows: SparqlRow[], groups: SourceGroup[] = []): SourceCandidate[] {
  const titles = collectTerms(rows, "dataset", "title")
  const sorts = new Map<string, string>()
  const groupIds = new Map<string, string>()
  for (const row of rows) {
    const id = row.dataset?.value
    if (id !== undefined) {
      sorts.set(id, row.sort?.value ?? "")
      if (row.group !== undefined) {
        groupIds.set(id, row.group.value)
      }
    }
  }
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  return [...titles.keys()]
    .sort((a, b) => compare(sorts.get(a) ?? "", sorts.get(b) ?? "") || compare(a, b))
    .map((id) => ({
      id,
      title: labelOrIri(toLanguageString(titles.get(id) ?? []), id),
      groupLabel: groups.find((group) => group.id === groupIds.get(id))?.label ?? {},
    }))
}
