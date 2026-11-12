import type { SparqlRow } from "../sparql-client"
import { formatName, formatRank } from "./distribution"
import { assertSafeIri, compareText, firstValue, groupRows, termsOf, toLanguageString } from "../sparql-utils"
import type { ChosenDistribution, SourceRecord } from "../sparql-source"
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
 * Chooses the distribution to read the metadata from among the rows of {@link distributionsQuery}: the one
 * in the most suitable format, the OFN JSON-LD file first, and among those of one format the first by IRI.
 * A distribution without any address is not chosen. Null when there is no distribution.
 *
 * A distribution that has a service and no file to download is an endpoint, such as a SPARQL endpoint.
 */
export function chooseDistribution(rows: SparqlRow[]): ChosenDistribution | null {
  const distributions = [...groupRows(rows, "distribution")].flatMap(([id, group]) => {
    const downloadUrl = firstValue(group, "downloadUrl") ?? null
    const accessUrl = firstValue(group, "accessUrl") ?? downloadUrl
    if (accessUrl === null) {
      return []
    }
    const isEndpoint = downloadUrl === null && group.some((row) => row.service !== undefined)
    return [{ id, format: formatName(firstValue(group, "format"), isEndpoint), accessUrl, downloadUrl }]
  })
  distributions.sort((a, b) => formatRank(a.format) - formatRank(b.format) || compareText(a.id, b.id))
  const best = distributions[0]
  return best === undefined ? null : { format: best.format, accessUrl: best.accessUrl, downloadUrl: best.downloadUrl }
}

/**
 * Builds what the source knows about a record from the rows of {@link recordQuery} and {@link distributionsQuery}.
 */
export function buildRecord(recordRows: SparqlRow[], distributionRows: SparqlRow[]): SourceRecord {
  return {
    title: toLanguageString(termsOf(recordRows, "title")),
    documentationUrl: firstValue(recordRows, "page") ?? null,
    distribution: chooseDistribution(distributionRows),
  }
}
