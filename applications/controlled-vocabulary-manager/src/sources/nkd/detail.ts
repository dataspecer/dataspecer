import type { SparqlRow, SparqlTerm } from "../sparql-client"
import type { CandidateDetail, SourceDistribution } from "../types"
import { formatName, formatRank, isReadableFormat } from "./distribution"
import { assertSafeIri, toLanguageString } from "../sparql-utils"
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
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * The first non-empty value of the variable in the rows, undefined if there is none.
 */
function firstValue(rows: SparqlRow[], variable: string): string | undefined {
  return rows.map((row) => row[variable]?.value).find((value) => value !== undefined && value !== "")
}

/**
 * Maps query results, selects the most suitable distribution first. 
 * The rows of one distribution are merged. A distribution without any address is left out.
 *
 * A distribution that has a service and no file to download is an endpoint,
 * such as a SPARQL endpoint.
 */
export function mapDistributionRows(rows: SparqlRow[]): SourceDistribution[] {
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
    const isEndpoint = downloadUrl === null && group.some((row) => row.service !== undefined)
    const format = formatName(firstValue(group, "format"), isEndpoint)
    const titles = group.map((row) => row.title).filter((title): title is SparqlTerm => title !== undefined)
    distributions.push({
      id,
      title: toLanguageString(titles),
      format,
      readable: isReadableFormat(format),
      accessUrl,
      downloadUrl,
    })
  }
  return distributions.sort(compareDistributions)
}

/**
 * Builds what the source knows about a codelist from the rows of
 * {@link recordQuery} and {@link distributionsQuery}. The distribution to preselect is the most suitable one.
 */
export function buildDetail(datasetIri: string, recordRows: SparqlRow[], distributionRows: SparqlRow[]): CandidateDetail {
  const titles = recordRows.map((row) => row.title).filter((title): title is SparqlTerm => title !== undefined)
  const distributions = mapDistributionRows(distributionRows)
  return {
    id: datasetIri,
    title: toLanguageString(titles),
    documentationUrl: firstValue(recordRows, "page") ?? null,
    distributions,
    defaultDistributionId: distributions[0]?.id ?? null,
  }
}
