const FILE_TYPE_IRI = "http://publications.europa.eu/resource/authority/file-type/"

/**
 * Names of the file types of the EU vocabulary used by NKOD for the format of
 * a distribution, by the last part of the IRI of the file type.
 */
const FORMAT_NAMES: Record<string, string> = {
  JSON_LD: "JSON-LD",
  RDF_TURTLE: "Turtle",
  RDF_XML: "RDF/XML",
  RDF_TRIG: "TriG",
  RDF_N_TRIPLES: "N-Triples",
  RDF_N_QUADS: "N-Quads",
  RDFA: "RDFa",
  CSV: "CSV",
  XML: "XML",
  JSON: "JSON",
  XLSX: "XLSX",
}

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
  const code = formatIri.startsWith(FILE_TYPE_IRI) ? formatIri.slice(FILE_TYPE_IRI.length) : formatIri
  return FORMAT_NAMES[code] ?? code
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
  const index = FORMAT_ORDER.indexOf(format)
  return index === -1 ? FORMAT_ORDER.length : index
}
