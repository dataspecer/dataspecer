import { buildIriPattern } from "../iri-pattern"
import { tagUntagged } from "../sparql-utils"
import type {
  MetadataOptions,
  MetadataResult,
  MetadataWarning,
  VocabularyMetadata,
} from "../types"
import type { SourceRecord } from "../sparql-source"
import { carriesSkos, isReadableFormat } from "./distribution"
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
 * Reads the metadata of a vocabulary from its NKD record and from the chosen
 * distribution.
 *
 * Whatever the distribution, the name and the documentation come from the
 * record and the addresses from the distribution. When it is an OFN JSON-LD
 * file, the file is loaded to read the IRI of the vocabulary and to derive the
 * pattern of the IRIs of its values. A problem with loading or reading the
 * file is returned as a warning together with what is known. A record without a
 * distribution has no addresses, which the warning noDistribution says.
 */
export async function deriveMetadata(
  record: SourceRecord,
  options: MetadataOptions,
  dependencies: MetadataDependencies = {},
): Promise<MetadataResult> {
  const { distribution } = record
  const conformsToSkos = distribution === null || carriesSkos(distribution.format)
  const accessUrl = distribution === null ? "" : distribution.downloadUrl ?? distribution.accessUrl
  const warnings: MetadataWarning[] = distribution === null ? [{ code: "noDistribution" }] : []
  // A vocabulary that is not SKOS has no scheme, it is referenced by its address.
  let references = conformsToSkos ? "" : accessUrl
  let pattern: string | null = null
  let sampleIris: string[] = []

  if (distribution !== null && isReadableFormat(distribution.format)) {
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
  } else if (distribution !== null && conformsToSkos) {
    warnings.push({ code: "unsupportedFormat" })
  }

  const metadata: VocabularyMetadata = {
    title: tagUntagged(record.title, options.language),
    pattern,
    references,
    conformsToSkos,
    documentation: record.documentationUrl,
    distribution: {
      downloadUrl: distribution === null || distribution.downloadUrl === null ? null : accessUrl,
      accessUrl,
    },
    iri: null,
  }
  return { metadata, warnings, sampleIris }
}
