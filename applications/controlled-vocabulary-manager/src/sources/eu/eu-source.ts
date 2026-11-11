import { createCatalogueLoader } from "../catalogue"
import { runSparqlSelect } from "../sparql-client"
import type { RequestOptions, VocabularySource } from "../types"
import { buildDetail, distributionsQuery, recordQuery } from "./detail"
import { catalogueQuery, groupNamesQuery } from "./listing"
import { readMetadata } from "./metadata"

/**
 * The endpoint of the European Data Portal, which has the Reference Data Catalogue of EU Vocabularies.
 * The endpoint of the Publications Office itself does not allow requests from a browser.
 */
export const EU_SPARQL_ENDPOINT = "https://data.europa.eu/sparql"

export interface EuSourceDependencies {
  /** Replaces the global fetch, for tests. */
  fetch?: typeof fetch
}

/**
 * The Reference Data Catalogue of EU Vocabularies, read from the SPARQL endpoint of the European Data Portal.
 * The vocabularies are the named authority lists, code lists, taxonomies and thesauri of the catalogue,
 * browsed by the bodies that created them.
 *
 * The catalogue has a few hundred vocabularies, which the listing reads at once (see {@link createCatalogueLoader}).
 */
export function createEuSource(dependencies: EuSourceDependencies = {}): VocabularySource {
  const run = (query: string, options?: RequestOptions) =>
    runSparqlSelect(EU_SPARQL_ENDPOINT, query, { signal: options?.signal, fetch: dependencies.fetch })

  return {
    id: "eu-vocabularies",
    loadCatalogue: createCatalogueLoader(
      async () => {
        const [catalogue, groupNames] = await Promise.all([run(catalogueQuery()), run(groupNamesQuery())])
        return { catalogue, groupNames }
      },
      { sortLanguage: "en" },
    ),
    getDetail: async (candidateId, options) => {
      const [recordRows, distributionRows] = await Promise.all([
        run(recordQuery(candidateId), options),
        run(distributionsQuery(candidateId), options),
      ])
      return buildDetail(candidateId, recordRows, distributionRows)
    },
    getMetadata: (detail, distributionId, options) => readMetadata(detail, distributionId, options, { run }),
  }
}

export const euSource = createEuSource()
