import { createSparqlSource } from "../sparql-source"
import type { VocabularySource } from "../types"
import { buildRecord, distributionsQuery, recordQuery } from "./detail"
import { catalogueQuery, groupNamesQuery } from "./listing"
import { deriveMetadata } from "./metadata"

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
 * The catalogue has a few hundred vocabularies, which the listing reads at once (see {@link createSparqlSource}).
 */
export function createEuSource(dependencies: EuSourceDependencies = {}): VocabularySource {
  return createSparqlSource({
    id: "eu-vocabularies",
    endpoint: EU_SPARQL_ENDPOINT,
    sortLanguage: "en",
    queries: { catalogue: catalogueQuery, groupNames: groupNamesQuery, record: recordQuery, distributions: distributionsQuery },
    deriveMetadata: (recordRows, distributionRows, options, { run }) =>
      deriveMetadata(buildRecord(recordRows, distributionRows), options, { run }),
  }, dependencies)
}

export const euSource = createEuSource()
