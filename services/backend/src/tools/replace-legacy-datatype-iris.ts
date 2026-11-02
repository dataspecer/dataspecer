const datatypeReplacements = new Map([
  ["boolean", "boolean"],
  ["datum-a-čas", "dateTime"],
  ["datum", "date"],
  ["čas", "time"],
  ["celé-číslo", "integer"],
  ["desetinné-číslo", "decimal"],
  ["url", "anyURI"],
  ["řetězec", "string"],
].map(([ofn, xsd]) => [
  `https://ofn.gov.cz/zdroj/základní-datové-typy/2020-07-01/${ofn}`,
  `http://www.w3.org/2001/XMLSchema#${xsd}`,
]));

/** Replaces legacy datatype IRIs throughout JSON values, including keys and embedded text. */
export function replaceLegacyDatatypeIris(value: unknown): unknown {
  if (typeof value === "string") {
    let result = value;
    for (const [ofn, xsd] of datatypeReplacements) {
      result = result.replaceAll(ofn, xsd);
    }
    return result;
  }
  if (Array.isArray(value)) return value.map(replaceLegacyDatatypeIris);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      replaceLegacyDatatypeIris(key), replaceLegacyDatatypeIris(item),
    ]));
  }
  return value;
}
