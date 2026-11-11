import { createCatalogueLoader } from "./catalogue"
import { runSparqlSelect, type SparqlRow } from "./sparql-client"
import type { CandidateDetail, MetadataOptions, MetadataResult, RequestOptions, VocabularySource } from "./types"

/**
 * Runs a SELECT query against the endpoint of the source.
 */
export type SparqlRunner = (query: string, options?: RequestOptions) => Promise<SparqlRow[]>

/**
 * How a source that reads its vocabularies from a SPARQL endpoint differs from the others.
 * - sortLanguage = the language the vocabularies are sorted by their title in
 * - queries = the queries that read the catalogue (see {@link createCatalogueLoader}) and one vocabulary
 * - buildDetail = builds what the source knows about a vocabulary from the rows of its record and of its distributions
 * - readMetadata = reads the metadata of a vocabulary, with the means to query the endpoint or to load a file
 */
export interface SparqlSourceConfig {
  id: string
  endpoint: string
  sortLanguage: string
  queries: {
    catalogue(): string
    groupNames(): string
    record(datasetIri: string): string
    distributions(datasetIri: string): string
  }
  buildDetail(datasetIri: string, recordRows: SparqlRow[], distributionRows: SparqlRow[]): CandidateDetail
  readMetadata(
    detail: CandidateDetail,
    distributionId: string,
    options: MetadataOptions,
    tools: { run: SparqlRunner, fetch?: typeof fetch },
  ): Promise<MetadataResult>
}

/**
 * Creates a source that reads its vocabularies from a SPARQL endpoint. The whole catalogue is read once, and
 * a vocabulary is read from its record and its distributions when it is chosen.
 * - dependencies.fetch = replaces the global fetch, for tests
 */
export function createSparqlSource(config: SparqlSourceConfig, dependencies: { fetch?: typeof fetch } = {}): VocabularySource {
  const { queries } = config
  const run: SparqlRunner = (query, options) =>
    runSparqlSelect(config.endpoint, query, { signal: options?.signal, fetch: dependencies.fetch })

  return {
    id: config.id,
    loadCatalogue: createCatalogueLoader(
      async () => {
        const [catalogue, groupNames] = await Promise.all([run(queries.catalogue()), run(queries.groupNames())])
        return { catalogue, groupNames }
      },
      { sortLanguage: config.sortLanguage },
    ),
    getDetail: async (candidateId, options) => {
      const [recordRows, distributionRows] = await Promise.all([
        run(queries.record(candidateId), options),
        run(queries.distributions(candidateId), options),
      ])
      return config.buildDetail(candidateId, recordRows, distributionRows)
    },
    getMetadata: (detail, distributionId, options) =>
      config.readMetadata(detail, distributionId, options, { run, fetch: dependencies.fetch }),
  }
}
