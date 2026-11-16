const FILE_TYPE_IRI = "http://publications.europa.eu/resource/authority/file-type/"

/**
 * Names of the file types of the EU vocabulary, which the catalogs use for the format of
 * a distribution, by the last part of the IRI of the file type.
 * A file type that is not here is named by its code.
 */
export const FORMAT_NAMES: Record<string, string> = {
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

/**
 * Short name of the file type with the IRI, such as "RDF/XML".
 */
export function fileTypeName(fileTypeIri: string): string {
  const code = fileTypeIri.startsWith(FILE_TYPE_IRI) ? fileTypeIri.slice(FILE_TYPE_IRI.length) : fileTypeIri
  return FORMAT_NAMES[code] ?? code
}
