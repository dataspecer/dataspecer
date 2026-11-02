import type { LanguageString } from "@dataspecer/core/core/core-resource"
import { buildIriPattern } from "../iri-pattern"
import type {
  CandidateDetail,
  MetadataOptions,
  MetadataResult,
  MetadataWarning,
  VocabularyMetadata,
} from "../types"
import { carriesSkos } from "./distribution"
import { parseOfnJsonLd, type OfnCodelist } from "./ofn-jsonld"

const FETCH_TIMEOUT_MS = 10_000
const SAMPLE_IRI_COUNT = 5

export interface MetadataDependencies {
  /** Replaces the global fetch, for tests. */
  fetch?: typeof fetch
  /** Time limit of loading the data file in milliseconds, 10 000 by default. */
  timeoutMs?: number
}

type LoadedCodelist = { codelist: OfnCodelist } | { warning: MetadataWarning }

/**
 * Loads the data file of a vocabulary and reads it as an OFN JSON-LD codelist.
 * A file that cannot be loaded or read gives a warning. A cancelled request
 * fails with the reason of the cancellation.
 *
 * The request has no custom headers, since the publishers allow cross-origin
 * requests from the browser only for simple requests, and some do not allow
 * them at all.
 */
async function loadCodelist(
  url: string,
  options: MetadataOptions,
  dependencies: MetadataDependencies,
): Promise<LoadedCodelist> {
  const { fetch: fetchImplementation = fetch, timeoutMs = FETCH_TIMEOUT_MS } = dependencies
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout])

  let text: string
  try {
    const response = await fetchImplementation(url, { signal })
    if (!response.ok) {
      return { warning: { code: "fetchFailed", detail: `HTTP ${response.status}` } }
    }
    // Some publishers start the file with a byte order mark, which JSON.parse does not accept.
    text = (await response.text()).replace(/^﻿/, "")
  } catch (error) {
    if (options.signal?.aborted) {
      throw error
    }
    const detail = timeout.aborted ? "timeout" : error instanceof Error ? error.message : undefined
    return { warning: { code: "fetchFailed", detail } }
  }

  let document: unknown
  try {
    document = JSON.parse(text)
  } catch {
    return { warning: { code: "notParsed" } }
  }
  const codelist = parseOfnJsonLd(document)
  return codelist === null ? { warning: { code: "notParsed" } } : { codelist }
}

/**
 * Gives the texts without a language tag, stored under the empty key, the language.
 */
function tagUntagged(text: LanguageString, language: string): LanguageString {
  const { "": untagged, ...tagged } = text
  const tag = language.split("-")[0].toLowerCase()
  return untagged !== undefined && tagged[tag] === undefined ? { ...tagged, [tag]: untagged } : tagged
}

/**
 * Reads the metadata of a vocabulary from its NKOD record and from the chosen
 * distribution.
 *
 * Whatever the distribution, the name and the documentation come from the
 * record and the addresses from the distribution. When it is an OFN JSON-LD
 * file, the file is loaded to read the IRI of the vocabulary and to derive the
 * pattern of the IRIs of its values. A problem with loading or reading the
 * file is returned as a warning together with what is known.
 */
export async function readMetadata(
  detail: CandidateDetail,
  distributionId: string,
  options: MetadataOptions,
  dependencies: MetadataDependencies = {},
): Promise<MetadataResult> {
  const distribution = detail.distributions.find((candidate) => candidate.id === distributionId)
  if (distribution === undefined) {
    throw new Error(`The record has no distribution ${distributionId}.`)
  }

  const conformsToSkos = carriesSkos(distribution.format)
  const accessUrl = distribution.downloadUrl ?? distribution.accessUrl
  const warnings: MetadataWarning[] = []
  // A vocabulary that is not SKOS has no scheme, it is referenced by its address.
  let references = conformsToSkos ? "" : accessUrl
  let pattern: string | null = null
  let sampleIris: string[] = []

  if (distribution.readable) {
    const loaded = await loadCodelist(accessUrl, options, dependencies)
    if ("warning" in loaded) {
      warnings.push(loaded.warning)
    } else {
      const { schemeIri, itemIris } = loaded.codelist
      if (schemeIri === null) {
        warnings.push({ code: "noSchemeIri" })
      } else {
        references = schemeIri
      }
      pattern = buildIriPattern(itemIris)
      if (pattern !== null) {
        sampleIris = [...new Set(itemIris)].slice(0, SAMPLE_IRI_COUNT)
      }
    }
  } else if (conformsToSkos) {
    warnings.push({ code: "unsupportedFormat" })
  }

  const metadata: VocabularyMetadata = {
    title: tagUntagged(detail.title, options.language),
    pattern,
    references,
    conformsToSkos,
    documentation: detail.documentationUrl,
    distribution: {
      downloadUrl: distribution.downloadUrl === null ? null : accessUrl,
      accessUrl,
    },
    iri: null,
  }
  return { metadata, warnings, sampleIris }
}
