import { fileTypeName, FORMAT_NAMES } from "../file-types"
import { rankIn } from "../sparql-utils"

export const SPARQL_FORMAT = "SPARQL"
export const UNKNOWN_FORMAT = "Other"
const JSON_LD_FORMAT = FORMAT_NAMES.JSON_LD

/**
 * The RDF formats, in which the data of a codelist are SKOS.
 */
const RDF_FORMATS = [
  JSON_LD_FORMAT,
  FORMAT_NAMES.RDF_TURTLE,
  FORMAT_NAMES.RDF_XML,
  FORMAT_NAMES.RDF_TRIG,
  FORMAT_NAMES.RDF_N_TRIPLES,
  FORMAT_NAMES.RDF_N_QUADS,
  FORMAT_NAMES.RDFA,
]

/**
 * The formats from the most to the least suitable to read the metadata of a
 * vocabulary from: the RDF formats first, the SPARQL endpoint last.
 */
const FORMAT_ORDER = [...RDF_FORMATS, FORMAT_NAMES.CSV, FORMAT_NAMES.XML, FORMAT_NAMES.JSON]

/**
 * Short name of the format of a distribution.
 * - formatIri = IRI of the file type, undefined when the distribution has none
 * - isEndpoint = whether the distribution is a service, such as a SPARQL endpoint
 */
export function formatName(formatIri: string | undefined, isEndpoint: boolean): string {
  if (formatIri === undefined) {
    return isEndpoint ? SPARQL_FORMAT : UNKNOWN_FORMAT
  }
  return fileTypeName(formatIri)
}

/**
 * Whether the scheme IRI and the value IRIs of the vocabulary can be read from
 * a distribution of the format. Only OFN JSON-LD is read.
 */
export function isReadableFormat(format: string): boolean {
  return format === JSON_LD_FORMAT
}

/**
 * Whether the data of a vocabulary distributed in the format are SKOS: they
 * are in an RDF format or behind a SPARQL endpoint.
 */
export function carriesSkos(format: string): boolean {
  return RDF_FORMATS.includes(format) || format === SPARQL_FORMAT
}

/**
 * Position of the format in the order of suitability, smaller is better.
 */
export function formatRank(format: string): number {
  if (format === SPARQL_FORMAT) {
    return FORMAT_ORDER.length + 1
  }
  return rankIn(FORMAT_ORDER, format)
}
