import type { SparqlRow } from "./sparql-client"
import { firstValue, termsOf, toLanguageString } from "./sparql-utils"
import type { SourceDistribution } from "./types"

/**
 * What a source tells about a distribution from its rows: the short name of the format of its file
 * and whether the metadata of the vocabulary can be derived from it.
 */
export type DistributionKind = Pick<SourceDistribution, "format" | "readable">

/**
 * Maps the rows of the query that reads the distributions of a vocabulary, a row for each title of each
 * distribution. Each row has ?distribution and may have ?title, ?accessUrl, ?downloadUrl and the variables
 * the source reads the kind of the distribution from. The rows of one distribution are merged. A distribution
 * without any address is left out, and one without an access URL is accessed at its download URL.
 *
 * The distributions are in the order of the rows, the source puts them in the order of its choice.
 * - kindOf = tells the kind of a distribution from its rows and its download URL, which is null for a distribution that is not a file
 */
export function mapDistributions(
  rows: SparqlRow[],
  kindOf: (distributionRows: SparqlRow[], downloadUrl: string | null) => DistributionKind,
): SourceDistribution[] {
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
      ...kindOf(group, downloadUrl),
      accessUrl,
      downloadUrl,
    })
  }
  return distributions
}
