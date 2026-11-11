import type { LanguageString } from "@dataspecer/core/core/core-resource"

/**
 * What the manager reads from a codelist published as JSON-LD.
 * - schemeIri = IRI of the codelist, null when the file gives none
 * - title = name of the codelist per language, empty when the file gives none
 * - itemIris = IRIs of the codelist items that have one
 */
export interface OfnCodelist {
  schemeIri: string | null
  title: LanguageString
  itemIris: string[]
}

/*
 * The Czech open formal norm (OFN) for codelists exists in two versions that
 * name the JSON-LD keys differently, and NKD records declare either of them in `dct:conformsTo`:
 * - the release of 2022-02-08 (`https://ofn.gov.cz/číselníky/2022-02-08/`)
 *   uses `iri` for the IRI of the codelist and of its items and `název` for
 *   the codelist name, for example in the files published by DIA;
 * - the earlier working draft (`https://ofn.gov.cz/číselníky/draft/`) uses
 *   `id` and `název-číselníku`, for example in the files published by ISVaVaI.
 * Both use `položky` for the list of items.
 * Some publishers (MPSV) do not use the OFN context at all and write
 * plain JSON-LD with ASCII-only keys (`polozky`, `nazev`) and `id` values relative to `@base`.
 */
const IRI_KEYS = ["iri", "id", "@id"]
const ITEMS_KEYS = ["položky", "polozky"]
const TITLE_KEYS = ["název", "název-číselníku", "nazev"]

const ABSOLUTE_IRI = /^[a-z][a-z0-9+.-]*:/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Finds the `@base` declared in the context, which is either an object or an
 * array of contexts.
 */
function findBase(context: unknown): string | null {
  const contexts = Array.isArray(context) ? context : [context]
  for (const entry of contexts) {
    if (isRecord(entry) && typeof entry["@base"] === "string") {
      return entry["@base"]
    }
  }
  return null
}

/**
 * Returns the IRI as written in the file. A relative IRI is resolved by
 * appending it to the base, which has to end with `/` or `#`; otherwise it
 * cannot be resolved and null is returned.
 */
function resolveIri(value: unknown, base: string | null): string | null {
  if (typeof value !== "string" || value === "") {
    return null
  }
  if (ABSOLUTE_IRI.test(value)) {
    return value
  }
  if (base !== null && /[/#]$/.test(base) && !/^[/.?#]/.test(value)) {
    return base + value
  }
  return null
}

function readIri(node: Record<string, unknown>, base: string | null): string | null {
  for (const key of IRI_KEYS) {
    const iri = resolveIri(node[key], base)
    if (iri !== null) {
      return iri
    }
  }
  return null
}

function readTitle(node: Record<string, unknown>): LanguageString {
  for (const key of TITLE_KEYS) {
    const value = node[key]
    if (isRecord(value)) {
      const title: LanguageString = {}
      for (const [language, text] of Object.entries(value)) {
        if (typeof text === "string" && text !== "") {
          title[language] = text
        }
      }
      return title
    }
  }
  return {}
}

/**
 * Reads a codelist from a parsed JSON-LD document in the form used by the Czech open formal norm for codelists. 
 * Returns null when the document is not recognizable as a codelist: it has neither an IRI nor a list of items.
 */
export function parseOfnJsonLd(document: unknown): OfnCodelist | null {
  if (!isRecord(document)) {
    return null
  }
  const base = findBase(document["@context"])
  const schemeIri = readIri(document, base)
  const itemsKey = ITEMS_KEYS.find((key) => Array.isArray(document[key]))
  if (schemeIri === null && itemsKey === undefined) {
    return null
  }

  const items = itemsKey === undefined ? [] : (document[itemsKey] as unknown[])
  const itemIris: string[] = []
  for (const item of items) {
    const iri = isRecord(item) ? readIri(item, base) : null
    if (iri !== null) {
      itemIris.push(iri)
    }
  }

  return { schemeIri, title: readTitle(document), itemIris }
}
