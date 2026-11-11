import type { SparqlRow } from "../sparql-client"
import { assertSafeIri, compareText, firstValue, termsOf, toLanguageString } from "../sparql-utils"
import type { CandidateDetail, SourceDistribution } from "../types"
import { mapDistributions } from "../distributions"
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
 * Maps the rows of {@link distributionsQuery}, the most suitable distribution first. The rows of one
 * distribution are merged. A distribution without any address is left out.
 *
 * RDF files come first; among files of one format the SKOS variant named in the title decides.
 * - readable = whether the metadata of the vocabulary can be derived, whatever the distribution
 */
export function mapDistributionRows(rows: SparqlRow[], readable: boolean): SourceDistribution[] {
  return mapDistributions(rows, (group) => ({ format: formatName(firstValue(group, "format")), readable }))
    .sort((a, b) =>
      formatRank(a.format) - formatRank(b.format)
      || variantRank(a.title) - variantRank(b.title)
      || compareText(a.id, b.id))
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
