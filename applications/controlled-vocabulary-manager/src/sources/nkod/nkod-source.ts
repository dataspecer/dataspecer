import { createCatalogueListing } from "../catalogue"
import { runSparqlSelect } from "../sparql-client"
import type { RequestOptions, VocabularySource } from "../types"
import { buildDetail, distributionsQuery, recordQuery } from "./detail"
import { catalogueQuery, groupNamesQuery } from "./listing"
import { readMetadata } from "./metadata"

export const NKOD_SPARQL_ENDPOINT = "https://data.gov.cz/sparql"

export interface NkodSourceDependencies {
  /** Replaces the global fetch, for tests. */
  fetch?: typeof fetch
}

/**
 * The Czech National Open Data Catalog (NKOD) SPARQL endpoint.
 * The vocabularies are the datasets of the catalog that conform to the open formal norm for codelists,
 * browsed by their publishers. There are a few hundred of them, which the listing reads at once
 * (see {@link createCatalogueListing}).
 */
export function createNkodSource(dependencies: NkodSourceDependencies = {}): VocabularySource {
  const run = (query: string, options?: RequestOptions) =>
    runSparqlSelect(NKOD_SPARQL_ENDPOINT, query, { signal: options?.signal, fetch: dependencies.fetch })

  return {
    id: "nkod",
    ...createCatalogueListing(
      async () => {
        const [catalogue, groupNames] = await Promise.all([run(catalogueQuery()), run(groupNamesQuery())])
        return { catalogue, groupNames }
      },
      { sortLanguage: "cs" },
    ),
    getDetail: async (candidateId, options) => {
      const [recordRows, distributionRows] = await Promise.all([
        run(recordQuery(candidateId), options),
        run(distributionsQuery(candidateId), options),
      ])
      return buildDetail(candidateId, recordRows, distributionRows)
    },
    getMetadata: (detail, distributionId, options) =>
      readMetadata(detail, distributionId, options, { fetch: dependencies.fetch }),
  }
}

export const nkodSource = createNkodSource()
