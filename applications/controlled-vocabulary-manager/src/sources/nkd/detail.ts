import type { SparqlRow } from "../sparql-client"
import type { CandidateDetail, SourceDistribution } from "../types"
import { mapDistributions } from "../distributions"
import { formatName, formatRank, isReadableFormat } from "./distribution"
import { assertSafeIri, compareText, firstValue, termsOf, toLanguageString } from "../sparql-utils"
import { PREFIXES } from "./listing"

/**
 * Reads the titles and the documentation page of a codelist. Each row has either ?title or ?page.
 */
export function recordQuery(datasetIri: string): string {
  assertSafeIri(datasetIri)
  return `${PREFIXES}
SELECT DISTINCT ?title ?page
WHERE {
  { <${datasetIri}> dct:title ?title }
  UNION
  { <${datasetIri}> foaf:page ?page }
}`
}

/**
 * Reads the distributions of a codelist, a row for each title of each
 * distribution.
 */
export function distributionsQuery(datasetIri: string): string {
  assertSafeIri(datasetIri)
  return `${PREFIXES}
SELECT DISTINCT ?distribution ?title ?format ?accessUrl ?downloadUrl ?service
WHERE {
  <${datasetIri}> dcat:distribution ?distribution .
  OPTIONAL { ?distribution dct:title ?title }
  OPTIONAL { ?distribution dct:format ?format }
  OPTIONAL { ?distribution dcat:accessURL ?accessUrl }
  OPTIONAL { ?distribution dcat:downloadURL ?downloadUrl }
  OPTIONAL { ?distribution dcat:accessService ?service }
}`
}

/**
 * Orders the distributions from the most suitable format to the least
 * suitable one, and those of the same format by IRI.
 */
function compareDistributions(a: SourceDistribution, b: SourceDistribution): number {
  const byFormat = formatRank(a.format) - formatRank(b.format)
  if (byFormat !== 0) {
    return byFormat
  }
  return compareText(a.id, b.id)
}

/**
 * Maps query results, selects the most suitable distribution first. 
 * The rows of one distribution are merged. A distribution without any address is left out.
 *
 * A distribution that has a service and no file to download is an endpoint,
 * such as a SPARQL endpoint.
 */
export function mapDistributionRows(rows: SparqlRow[]): SourceDistribution[] {
  return mapDistributions(rows, (group, downloadUrl) => {
    const isEndpoint = downloadUrl === null && group.some((row) => row.service !== undefined)
    const format = formatName(firstValue(group, "format"), isEndpoint)
    return { format, readable: isReadableFormat(format) }
  }).sort(compareDistributions)
}

/**
 * Builds what the source knows about a codelist from the rows of
 * {@link recordQuery} and {@link distributionsQuery}. The distribution to preselect is the most suitable one.
 */
export function buildDetail(datasetIri: string, recordRows: SparqlRow[], distributionRows: SparqlRow[]): CandidateDetail {
  const distributions = mapDistributionRows(distributionRows)
  return {
    id: datasetIri,
    title: toLanguageString(termsOf(recordRows, "title")),
    documentationUrl: firstValue(recordRows, "page") ?? null,
    distributions,
    defaultDistributionId: distributions[0]?.id ?? null,
  }
}
