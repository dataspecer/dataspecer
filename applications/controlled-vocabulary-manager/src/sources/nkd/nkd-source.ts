import { createSparqlSource } from "../sparql-source"
import type { VocabularySource } from "../types"
import { buildRecord, distributionsQuery, recordQuery } from "./detail"
import { catalogueQuery, groupNamesQuery } from "./listing"
import { deriveMetadata } from "./metadata"

export const NKD_SPARQL_ENDPOINT = "https://data.gov.cz/sparql"

export interface NkdSourceDependencies {
  /** Replaces the global fetch, for tests. */
  fetch?: typeof fetch
}

/**
 * The Czech National Data Catalog (NKD) SPARQL endpoint.
 * The vocabularies are the datasets of the catalog that conform to the open formal norm for codelists,
 * browsed by their publishers. There are a few hundred of them, which the listing reads at once
 * (see {@link createSparqlSource}).
 */
export function createNkdSource(dependencies: NkdSourceDependencies = {}): VocabularySource {
  return createSparqlSource({
    id: "nkd",
    endpoint: NKD_SPARQL_ENDPOINT,
    sortLanguage: "cs",
    queries: { catalogue: catalogueQuery, groupNames: groupNamesQuery, record: recordQuery, distributions: distributionsQuery },
    deriveMetadata: (recordRows, distributionRows, options, { fetch }) =>
      deriveMetadata(buildRecord(recordRows, distributionRows), options, { fetch }),
  }, dependencies)
}

export const nkdSource = createNkdSource()
