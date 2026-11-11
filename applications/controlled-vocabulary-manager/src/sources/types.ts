import type { LanguageString } from "@dataspecer/core/core/core-resource"
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model"
import type { Catalogue } from "./catalogue"

/**
 * Metadata of a controlled vocabulary as the form takes it, without the
 * identity the vocabulary gets when it is stored.
 */
export type VocabularyMetadata = Omit<ControlledVocabulary, "id" | "type">

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
 * Why some metadata of a vocabulary could not be read.
 * - fetchFailed = the data file could not be loaded, `detail` says why
 * - notParsed = the data file was loaded but is not a codelist the source understands
 * - noSchemeIri = the IRI of the vocabulary could not be determined
 * - unsupportedFormat = the source does not read the chosen distribution
 * - valuesNotLoaded = the values of the vocabulary could not be loaded to derive the pattern of their IRIs
 *   from them, `detail` says why, the pattern is a guess
 * - recordNotLoaded = the record of the vocabulary could not be loaded, `detail` says why, only its name is known
 * - noDistribution = the record has no distribution, so it has no addresses
 * - patternByConvention = the source has no values of the vocabulary to derive the pattern of their IRIs from, so the pattern
 *   follows the convention of the IRIs of this kind of vocabulary and no example IRIs are given
 */
export type MetadataWarningCode =
  | "fetchFailed" | "notParsed" | "noSchemeIri" | "unsupportedFormat" | "valuesNotLoaded" | "patternByConvention"
  | "recordNotLoaded" | "noDistribution"

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
 * Settings of {@link VocabularySource.readMetadata}.
 * - language = language tag given to texts that have none, such as the name of
 *   the vocabulary
 */
export interface MetadataOptions extends RequestOptions {
  language: string
}

/**
 * A place the user can look up controlled vocabularies in.
 * The user searches the vocabularies by name or browses them by group,
 * chooses one, and the source reads the metadata of the vocabulary from
 * its record and its best distribution.
 */
export interface VocabularySource {
  id: string
  /**
   * Gives all the vocabularies of the source with their groups. The catalogue is read once and kept,
   * and a failed reading is tried again by the next call.
   */
  loadCatalogue(): Promise<Catalogue>
  /**
   * Reads the metadata of the vocabulary from its record and from the best of its distributions. It does not
   * fail when the data cannot be loaded or read; it returns what is known with a warning instead, at least the name
   * of the vocabulary from the listing. It fails only when the request is cancelled.
   */
  readMetadata(candidate: SourceCandidate, options: MetadataOptions): Promise<MetadataResult>
}

/**
 * How a source is presented in the list of sources.
 * - available = false for a source that is announced but not usable yet
 * - metadataDerivation = how the source derives the metadata of a vocabulary, told to the user in the form
 */
export interface SourceDescriptor {
  id: string
  name: LanguageString
  url: string
  available: boolean
  metadataDerivation: LanguageString
}
