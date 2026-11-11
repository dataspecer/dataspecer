import { buildIriPattern, iriPrefixPattern } from "../iri-pattern"
import { SparqlError, type SparqlRow } from "../sparql-client"
import { tagUntagged } from "../sparql-utils"
import type {
  MetadataOptions,
  MetadataResult,
  MetadataWarning,
  RequestOptions,
  VocabularyMetadata,
} from "../types"
import type { EuRecord } from "./detail"
import { carriesSkos } from "./distribution"
import { PREFIXES } from "./listing"

/**
 * IRIs of the named authority lists are made of this IRI and the identifier of the list in the catalog.
 * The IRIs of the values of a list are made of the IRI of the list, a slash and the code of the value.
 */
export const AUTHORITY_LIST_IRI = "http://publications.europa.eu/resource/authority/"

/**
 * How many values of a list are read to derive the pattern of their IRIs from them.
 */
const SAMPLED_VALUES = 200
const SAMPLE_IRI_COUNT = 5

/**
 * The code of the value "Provisional data" that many lists have next to their real values. It is not a value
 * to show as an example, and it does not take part in deriving the pattern of the IRIs.
 */
const PROVISIONAL_DATA_CODE = "OP_DATPRO"

export interface MetadataDependencies {
  /** Runs a SELECT query against the endpoint of the catalog. */
  run: (query: string, options?: RequestOptions) => Promise<SparqlRow[]>
}

/**
 * Reads the IRIs of some of the values of the scheme.
 */
export function schemeValuesQuery(schemeIri: string): string {
  return `${PREFIXES}
SELECT DISTINCT ?value
WHERE {
  ?value skos:inScheme <${schemeIri}> .
}
LIMIT ${SAMPLED_VALUES}`
}

/**
 * IRI of the named authority list with the identifier, null for an identifier that is not
 * a plain name and so could not be a part of the IRI.
 */
export function authorityListIri(identifier: string): string | null {
  return /^[A-Za-z0-9._-]+$/.test(identifier) ? `${AUTHORITY_LIST_IRI}${identifier}` : null
}

/**
 * Reads the pattern of the IRIs of the values of the list.
 *
 * The catalog on data.europa.eu has the values of only some of the lists. 
 * When they are there, the pattern is derived from them. 
 * Otherwise it is the pattern that all the values of a named authority
 * list have by the convention of the Publications Office, and no values are returned to check it against,
 * which the warning patternByConvention says.
 * A failure of the endpoint gives the pattern by the convention and the warning valuesNotLoaded.
 */
async function readPattern(
  schemeIri: string,
  options: RequestOptions,
  dependencies: MetadataDependencies,
): Promise<{ pattern: string, sampleIris: string[], warnings: MetadataWarning[] }> {
  const byConvention = iriPrefixPattern(`${schemeIri}/`)
  let rows: SparqlRow[]
  try {
    rows = await dependencies.run(schemeValuesQuery(schemeIri), options)
  } catch (error) {
    if (options.signal?.aborted || (error instanceof SparqlError && error.kind === "aborted")) {
      throw error
    }
    const detail = error instanceof Error ? error.message : undefined
    return { pattern: byConvention, sampleIris: [], warnings: [{ code: "valuesNotLoaded", detail }] }
  }
  const iris = rows
    .map((row) => row.value?.value)
    .filter((iri): iri is string => iri !== undefined && !iri.endsWith(`/${PROVISIONAL_DATA_CODE}`))
  const derived = buildIriPattern(iris)
  if (derived === null) {
    return { pattern: byConvention, sampleIris: [], warnings: [{ code: "patternByConvention" }] }
  }
  return { pattern: derived, sampleIris: [...new Set(iris)].slice(0, SAMPLE_IRI_COUNT), warnings: [] }
}

/**
 * Reads the metadata of a vocabulary from its record in the catalog and the chosen distribution.
 *
 * The title, the documentation and the addresses come from the record and the distribution. The files
 * of the distributions cannot be read by a browser, so the scheme IRI and the pattern are not read from them:
 * - a named authority list has the IRI derived from its identifier, and the pattern derived from
 *   its values in the catalog, or by the convention when it has none there
 * - the IRI of any other vocabulary cannot be derived, so it and the pattern are left empty with a warning
 * - a distribution that is not SKOS has no scheme, the vocabulary is referenced by the address of the distribution
 * - a record without a distribution has no addresses, which the warning noDistribution says
 */
export async function deriveMetadata(
  record: EuRecord,
  options: MetadataOptions,
  dependencies: MetadataDependencies,
): Promise<MetadataResult> {
  const { distribution } = record
  const conformsToSkos = distribution === null || carriesSkos(distribution.format)
  const accessUrl = distribution === null ? "" : distribution.downloadUrl ?? distribution.accessUrl
  const warnings: MetadataWarning[] = distribution === null ? [{ code: "noDistribution" }] : []
  let references = conformsToSkos ? "" : accessUrl
  let pattern: string | null = null
  let sampleIris: string[] = []

  if (conformsToSkos) {
    const schemeIri = record.isNamedAuthorityList && record.identifier !== null
      ? authorityListIri(record.identifier)
      : null
    if (schemeIri === null) {
      warnings.push({ code: "noSchemeIri" })
    } else {
      references = schemeIri
      const read = await readPattern(schemeIri, options, dependencies)
      pattern = read.pattern
      sampleIris = read.sampleIris
      warnings.push(...read.warnings)
    }
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
