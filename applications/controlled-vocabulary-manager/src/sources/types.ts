import type { LanguageString } from "@dataspecer/core/core/core-resource"
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model"

/**
 * Metadata of a controlled vocabulary as the form takes it, without the
 * identity the vocabulary gets when it is stored.
 */
export type VocabularyMetadata = Omit<ControlledVocabulary, "id" | "type">

/**
 * Pagination. The listing is split to pages of `limit` items, starting with the item at position `offset`.
 * `total` is the number of items found by an earlier request for the same listing. 
 * When it is given, the source does not have to count them again. A source that has the whole listing at hand ignores it.
 */
export interface PageRequest {
  offset: number
  limit: number
  total?: number
}

export interface Page<T> {
  items: T[]
  /** Number of items in the whole listing, not only on this page. */
  total: number
}

/**
 * Optional settings of every request to a source.
 */
export interface RequestOptions {
  /** Cancels the request. */
  signal?: AbortSignal
}

/**
 * A group the vocabularies of a source are browsed by, such as a publisher.
 */
export interface SourceGroup {
  id: string
  label: LanguageString
  /** Number of vocabularies in the group. */
  count: number
}

/**
 * Restricts which vocabularies of a source are listed.
 * - groupId = only vocabularies of this group
 * - query = only vocabularies whose name contains the text, ignoring case
 */
export interface CandidateFilter {
  groupId?: string
  query?: string
}

/**
 * A vocabulary offered by a source, with what is needed to list it.
 */
export interface SourceCandidate {
  id: string
  title: LanguageString
  /** Name of the group the vocabulary belongs to, when the source has groups. */
  groupLabel: LanguageString
}

/**
 * One way of getting the data of a vocabulary.
 * - format = short name of the data format, for example "JSON-LD"
 * - readable = whether the source can derive the vocabulary's scheme IRI and
 *   the pattern of its value IRIs when this distribution is chosen
 * - downloadUrl = address of a file, null when the distribution is not a file,
 *   for example a SPARQL endpoint
 */
export interface SourceDistribution {
  id: string
  title: LanguageString
  format: string
  readable: boolean
  accessUrl: string
  downloadUrl: string | null
}

/**
 * What a source knows about a vocabulary chosen from its listing.
 * - defaultDistributionId = the distribution to preselect, null if there is none
 */
export interface CandidateDetail {
  id: string
  title: LanguageString
  documentationUrl: string | null
  distributions: SourceDistribution[]
  defaultDistributionId: string | null
}

/**
 * Why some metadata of a vocabulary could not be read.
 * - fetchFailed = the data file could not be loaded, `detail` says why
 * - notParsed = the data file was loaded but is not a codelist the source understands
 * - noSchemeIri = the IRI of the vocabulary could not be determined
 * - unsupportedFormat = the source does not read the chosen distribution
 * - valuesNotLoaded = the values of the vocabulary could not be loaded to derive the pattern of their IRIs
 *   from them, `detail` says why, the pattern is a guess
 */
export type MetadataWarningCode = "fetchFailed" | "notParsed" | "noSchemeIri" | "unsupportedFormat" | "valuesNotLoaded"

export interface MetadataWarning {
  code: MetadataWarningCode
  detail?: string
}

/**
 * Metadata of a vocabulary read from its record and from the chosen distribution.
 * - warnings = what could not be read
 * - sampleIris = a few IRIs of vocabulary values read from the data file, to
 *   check the pattern of the IRIs against; empty if the metadata have no pattern
 */
export interface MetadataResult {
  metadata: VocabularyMetadata
  warnings: MetadataWarning[]
  sampleIris: string[]
}

/**
 * Settings of {@link VocabularySource.getMetadata}.
 * - language = language tag given to texts that have none, such as the name of
 *   the vocabulary
 */
export interface MetadataOptions extends RequestOptions {
  language: string
}

/**
 * A place the user can look up controlled vocabularies in.
 * The user searches the vocabularies by name or browses them by group,
 * chooses one and one of its distributions, and the source reads the
 * metadata of the vocabulary from it.
 */
export interface VocabularySource {
  id: string
  /**
   * Lists the groups vocabularies can be browsed by. A source without groups
   * does not have it and is only searched.
   */
  listGroups?(request: PageRequest, options?: RequestOptions): Promise<Page<SourceGroup>>
  listCandidates(
    filter: CandidateFilter,
    request: PageRequest,
    options?: RequestOptions,
  ): Promise<Page<SourceCandidate>>
  getDetail(candidateId: string, options?: RequestOptions): Promise<CandidateDetail>
  /**
   * Reads the metadata of the vocabulary from its record and from the chosen
   * distribution. It does not fail when the data cannot be loaded or read; it
   * returns what is known with a warning instead. It fails only when the
   * request is cancelled.
   */
  getMetadata(
    detail: CandidateDetail,
    distributionId: string,
    options: MetadataOptions,
  ): Promise<MetadataResult>
}

/**
 * How a source is presented in the list of sources.
 * - available = false for a source that is announced but not usable yet
 * - metadataDerivation = what the source does with the chosen distribution and how it derives the
 *   metadata of the vocabulary, told to the user before they continue
 */
export interface SourceDescriptor {
  id: string
  name: LanguageString
  url: string
  available: boolean
  metadataDerivation: LanguageString
}
