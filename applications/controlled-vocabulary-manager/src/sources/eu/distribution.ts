import type { LanguageString } from "@dataspecer/core/core/core-resource"
import { fileTypeName, FORMAT_NAMES } from "../file-types"

export const UNKNOWN_FORMAT = "Other"

/**
 * The generic RDF file type the catalog uses for RDF files that are neither RDF/XML nor Turtle.
 */
const RDF_FORMAT = fileTypeName("RDF")

/**
 * The RDF formats the catalog distributes, in which the data of a vocabulary are SKOS.
 */
const RDF_FORMATS = [FORMAT_NAMES.RDF_XML, FORMAT_NAMES.RDF_TURTLE, RDF_FORMAT]

/**
 * The formats from the most to the least suitable to take the vocabulary from: the RDF formats first.
 * The other formats follow in no particular order.
 */
const FORMAT_ORDER = [...RDF_FORMATS, FORMAT_NAMES.CSV, FORMAT_NAMES.XML, FORMAT_NAMES.JSON]

/**
 * Parts of the titles of the distributions that tell the variant of SKOS of an RDF file, from the most
 * to the least suitable one: plain SKOS, then the application profiles of SKOS of the EU.
 */
const VARIANT_ORDER = ["SKOS_CORE", "SKOS_AP_EU", "SKOS_AP_ACT"]

/**
 * Short name of the format of a distribution, such as "RDF/XML".
 * - fileTypeIri = IRI of the file type, undefined when the distribution has none
 */
export function formatName(fileTypeIri: string | undefined): string {
  return fileTypeIri === undefined ? UNKNOWN_FORMAT : fileTypeName(fileTypeIri)
}

/**
 * Whether the data of a vocabulary distributed in the format are SKOS: they are in an RDF format.
 */
export function carriesSkos(format: string): boolean {
  return RDF_FORMATS.includes(format)
}

/**
 * Position of the format in the order of suitability, smaller is better.
 */
export function formatRank(format: string): number {
  const index = FORMAT_ORDER.indexOf(format)
  return index === -1 ? FORMAT_ORDER.length : index
}

/**
 * Position of the variant named in the title of the distribution in the order of suitability, smaller is better.
 * The English title is used, or the first one when there is none. A title that names no variant is the last.
 */
export function variantRank(title: LanguageString): number {
  const text = title.en ?? Object.values(title)[0] ?? ""
  const index = VARIANT_ORDER.findIndex((variant) => text.includes(variant))
  return index === -1 ? VARIANT_ORDER.length : index
}
