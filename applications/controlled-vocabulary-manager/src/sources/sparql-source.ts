import type { LanguageString } from "@dataspecer/core/core/core-resource"
import { createCatalogueLoader } from "./catalogue"
import { runSparqlSelect, SparqlError, type SparqlRow } from "./sparql-client"
import { tagUntagged } from "./sparql-utils"
import type {
  MetadataOptions,
  MetadataResult,
  RequestOptions,
  SourceCandidate,
  VocabularySource,
} from "./types"

/**
 * Runs a SELECT query against the endpoint of the source.
 */
export type SparqlRunner = (query: string, options?: RequestOptions) => Promise<SparqlRow[]>

/**
 * The distribution the metadata of a vocabulary are read from: the best one the record has.
 */
export interface ChosenDistribution {
  format: string
  accessUrl: string
  downloadUrl: string | null
}

/**
 * What the record of a vocabulary says, with the distribution chosen to read the metadata from.
 * - distribution = null when the record has no distribution
 */
export interface SourceRecord {
  title: LanguageString
  documentationUrl: string | null
  distribution: ChosenDistribution | null
}

/**
 * How a source that reads its vocabularies from a SPARQL endpoint differs from the others.
 * - sortLanguage = the language the vocabularies are sorted by their title in
 * - queries = the queries that read the catalogue (see {@link createCatalogueLoader}) and one vocabulary
 * - deriveMetadata = reads the metadata of a vocabulary from the rows of its record and of its distributions,
 *   choosing the distribution to read them from, with the means to query the endpoint or to load a file
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
  deriveMetadata(
    recordRows: SparqlRow[],
    distributionRows: SparqlRow[],
    options: MetadataOptions,
    tools: { run: SparqlRunner, fetch?: typeof fetch },
  ): Promise<MetadataResult>
}

/**
 * The metadata of a vocabulary whose record could not be loaded: its name from the listing, the rest is left to the user.
 */
function recordNotLoaded(candidate: SourceCandidate, options: MetadataOptions, error: unknown): MetadataResult {
  return {
    metadata: {
      title: tagUntagged(candidate.title, options.language),
      pattern: null,
      references: "",
      conformsToSkos: true,
      documentation: null,
      distribution: { downloadUrl: null, accessUrl: "" },
      iri: null,
    },
    warnings: [{ code: "recordNotLoaded", detail: error instanceof Error ? error.message : undefined }],
    sampleIris: [],
  }
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
    readMetadata: async (candidate, options) => {
      let rows: [SparqlRow[], SparqlRow[]]
      try {
        rows = await Promise.all([run(queries.record(candidate.id), options), run(queries.distributions(candidate.id), options)])
      } catch (error) {
        if (options.signal?.aborted || (error instanceof SparqlError && error.kind === "aborted")) {
          throw error
        }
        return recordNotLoaded(candidate, options, error)
      }
      return config.deriveMetadata(rows[0], rows[1], options, { run, fetch: dependencies.fetch })
    },
  }
}
