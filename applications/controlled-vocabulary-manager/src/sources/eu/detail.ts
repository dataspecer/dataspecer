import type { SparqlRow, SparqlTerm } from "../sparql-client"
import { assertSafeIri, toLanguageString } from "../sparql-utils"
import type { CandidateDetail, SourceDistribution } from "../types"
import { formatName, formatRank, variantRank } from "./distribution"
import { DATASET_TYPE_IRI, NAMED_AUTHORITY_LIST, PREFIXES } from "./listing"

/**
 * What the source knows about a vocabulary besides {@link CandidateDetail}.
 * - identifier = identifier of the vocabulary in the catalog, such as "country"
 * - isNamedAuthorityList = whether it is a named authority list, whose IRI is derived from the identifier
 */
export interface EuCandidateDetail extends CandidateDetail {
  identifier: string | null
  isNamedAuthorityList: boolean
}

/**
 * Reads the titles, the identifier, the type and the documentation page of a vocabulary.
 * Each row has one of ?title, ?identifier, ?type, ?page and ?landingPage.
 *
 * It asks for all titles. A pattern that selects the title of one language from a single record is
 * rejected by the endpoint as too expensive.
 */
export function recordQuery(datasetIri: string): string {
  assertSafeIri(datasetIri)
  return `${PREFIXES}
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT DISTINCT ?title ?identifier ?type ?page ?landingPage
WHERE {
  { <${datasetIri}> dct:title ?title }
  UNION
  { <${datasetIri}> dct:identifier ?identifier }
  UNION
  { <${datasetIri}> dct:type ?type }
  UNION
  { <${datasetIri}> foaf:page ?page }
  UNION
  { <${datasetIri}> dcat:landingPage ?landingPage }
}`
}

/**
 * Reads the distributions of a vocabulary, a row for each title of each distribution.
 */
export function distributionsQuery(datasetIri: string): string {
  assertSafeIri(datasetIri)
  return `${PREFIXES}
SELECT DISTINCT ?distribution ?title ?format ?accessUrl ?downloadUrl
WHERE {
  <${datasetIri}> dcat:distribution ?distribution .
  OPTIONAL { ?distribution dct:title ?title }
  OPTIONAL { ?distribution dct:format ?format }
  OPTIONAL { ?distribution dcat:accessURL ?accessUrl }
  OPTIONAL { ?distribution dcat:downloadURL ?downloadUrl }
}`
}

/**
 * The first non-empty value of the variable in the rows, undefined if there is none.
 */
function firstValue(rows: SparqlRow[], variable: string): string | undefined {
  return rows.map((row) => row[variable]?.value).find((value) => value !== undefined && value !== "")
}

function termsOf(rows: SparqlRow[], variable: string): SparqlTerm[] {
  return rows.map((row) => row[variable]).filter((term): term is SparqlTerm => term !== undefined)
}

/**
 * Maps the rows of {@link distributionsQuery}, the most suitable distribution first. The rows of one
 * distribution are merged. A distribution without any address is left out.
 *
 * RDF files come first; among files of one format the SKOS variant named in the title decides.
 * - readable = whether the metadata of the vocabulary can be derived, whatever the distribution
 */
export function mapDistributionRows(rows: SparqlRow[], readable: boolean): SourceDistribution[] {
  const rowsByDistribution = new Map<string, SparqlRow[]>()
  for (const row of rows) {
    const id = row.distribution?.value
    if (id !== undefined) {
      rowsByDistribution.set(id, [...(rowsByDistribution.get(id) ?? []), row])
    }
  }

  const distributions: SourceDistribution[] = []
  for (const [id, group] of rowsByDistribution) {
    const downloadUrl = firstValue(group, "downloadUrl") ?? null
    const accessUrl = firstValue(group, "accessUrl") ?? downloadUrl
    if (accessUrl === null) {
      continue
    }
    distributions.push({
      id,
      title: toLanguageString(termsOf(group, "title")),
      format: formatName(firstValue(group, "format")),
      readable,
      accessUrl,
      downloadUrl,
    })
  }
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  return distributions.sort((a, b) =>
    formatRank(a.format) - formatRank(b.format)
    || variantRank(a.title) - variantRank(b.title)
    || compare(a.id, b.id))
}

/**
 * Builds what the source knows about a vocabulary from the rows of {@link recordQuery} and
 * {@link distributionsQuery}. The distribution to preselect is the most suitable one.
 */
export function buildDetail(datasetIri: string, recordRows: SparqlRow[], distributionRows: SparqlRow[]): EuCandidateDetail {
  const isNamedAuthorityList = firstValue(recordRows, "type") === `${DATASET_TYPE_IRI}${NAMED_AUTHORITY_LIST}`
  const distributions = mapDistributionRows(distributionRows, isNamedAuthorityList)
  return {
    id: datasetIri,
    title: toLanguageString(termsOf(recordRows, "title")),
    documentationUrl: firstValue(recordRows, "page") ?? firstValue(recordRows, "landingPage") ?? null,
    distributions,
    defaultDistributionId: distributions[0]?.id ?? null,
    identifier: firstValue(recordRows, "identifier") ?? null,
    isNamedAuthorityList,
  }
}
