import type { SparqlRow } from "../sparql-client"
import { assertSafeIri, compareText, firstValue, groupRows, termsOf, toLanguageString } from "../sparql-utils"
import type { ChosenDistribution, SourceRecord } from "../sparql-source"
import { formatName, formatRank, variantRank } from "./distribution"
import { DATASET_TYPE_IRI, NAMED_AUTHORITY_LIST, PREFIXES } from "./listing"

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
 * What the source knows about a record of the catalog.
 * - identifier = identifier of the vocabulary in the catalog, such as "country"
 * - isNamedAuthorityList = whether it is a named authority list, whose IRI is derived from the identifier
 */
export interface EuRecord extends SourceRecord {
  identifier: string | null
  isNamedAuthorityList: boolean
}

/**
 * Chooses the distribution to read the metadata from among the rows of {@link distributionsQuery}: the RDF/XML one,
 * and among those the one with the SKOS variant that is the most suitable by its title. When there is no RDF/XML
 * distribution, it is the next of the formats by their order. A distribution without any address is not chosen.
 * Null when there is no distribution.
 */
export function chooseDistribution(rows: SparqlRow[]): ChosenDistribution | null {
  const distributions = [...groupRows(rows, "distribution")].flatMap(([id, group]) => {
    const downloadUrl = firstValue(group, "downloadUrl") ?? null
    const accessUrl = firstValue(group, "accessUrl") ?? downloadUrl
    return accessUrl === null ? [] : [{
      id,
      title: toLanguageString(termsOf(group, "title")),
      format: formatName(firstValue(group, "format")),
      accessUrl,
      downloadUrl,
    }]
  })
  distributions.sort((a, b) =>
    formatRank(a.format) - formatRank(b.format)
    || variantRank(a.title) - variantRank(b.title)
    || compareText(a.id, b.id))
  const best = distributions[0]
  return best === undefined ? null : { format: best.format, accessUrl: best.accessUrl, downloadUrl: best.downloadUrl }
}

/**
 * Builds what the source knows about a record from the rows of {@link recordQuery} and {@link distributionsQuery}.
 */
export function buildRecord(recordRows: SparqlRow[], distributionRows: SparqlRow[]): EuRecord {
  return {
    title: toLanguageString(termsOf(recordRows, "title")),
    documentationUrl: firstValue(recordRows, "page") ?? firstValue(recordRows, "landingPage") ?? null,
    distribution: chooseDistribution(distributionRows),
    identifier: firstValue(recordRows, "identifier") ?? null,
    isNamedAuthorityList: firstValue(recordRows, "type") === `${DATASET_TYPE_IRI}${NAMED_AUTHORITY_LIST}`,
  }
}
