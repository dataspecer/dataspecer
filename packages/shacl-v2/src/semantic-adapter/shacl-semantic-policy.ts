
export interface SemanticModelsToShaclPolicy {

  /**
   * @returns String to be used for the root of the SHACL shape.
   */
  shaclModelIri: () => string;

  /**
   * @param entity IRI of represented profile.
   * @param type IRI of represented RDF type.
   * @returns IRI for a node shape.
   */
  shaclNodeShape: (profile: string, type: string) => string;

  /**
   * @returns IRI for a predicate shape.
   */
  shaclPredicateShape: (profile: string, type: string, predicate: {
    path: string,
    datatype: string | null,
    class: string | null,
    minCount: number | null,
    maxCount: number | null,
  }) => string;

  /**
   * Returns node types we are allowed to check for.
   */
  nodeTypeFilter: (types: string[]) => string[];

  /**
   * Returns literal range types we allowed to check for.
   */
  literalTypeFilter: (types: string[]) => string[];

  /**
   * Use depends on the configuration.
   * The conversion algorithm does not use prefixes directly.
   */
  prefixes: () => { [urlPrefix: string]: string };

  /**
   * Called for every data type value in a Literal property shape.
   * This function is called after
   * {@link SemanticModelsToShaclPolicy.literalTypeFilter}.
   */
  literalTypeMap: (type: string) => string;

}

/**
 * Node shape IRI is created as: {base iri}/{prefixed type iri}Shape.
 * Predicate shape IRI is created as: {node shape iri}/{property hash}.
 *
 * @see https://github.com/SEMICeu/DCAT-AP/blob/master/releases/3.0.0/shacl/dcat-ap-SHACL.ttl
 */
export function createSemicShaclStylePolicy(
  baseIri: string,
  defaultPrefixes: Record<string, string>,
): SemanticModelsToShaclPolicy {

  // If there is "#" in the IRI we are in fragment section,
  // we do not need to encode : , ale we need to.
  const isFragment = baseIri.includes("#");

  const prefixes: Record<string, string> = {
    "http://www.w3.org/ns/dcat#": "dcat",
    "http://purl.org/dc/terms/": "dcterms",
    "http://xmlns.com/foaf/0.1/": "foaf",
    "http://spdx.org/rdf/terms#": "spdx",
    "http://www.w3.org/ns/locn#": "locn",
    "http://www.w3.org/2006/time#": "time",
    "http://www.w3.org/2004/02/skos/core#": "skos",
    "http://www.w3.org/ns/prov#": "prov",
    "http://www.w3.org/2000/01/rdf-schema#": "rdfs",
    "http://www.w3.org/2006/vcard/ns#": "vcard",
    "http://data.europa.eu/eli/ontology#": "eli",
    "http://www.w3.org/ns/adms#": "adms",
    "http://www.w3.org/ns/shacl#": "sh",
    "http://www.w3.org/2001/XMLSchema#": "xsd",
    ...defaultPrefixes,
  };

  // We do not want to use selected types for shacl:class check.
  // https://github.com/dataspecer/dataspecer/issues/1295
  const typesToIgnore: Set<string> = new Set([
    "http://www.w3.org/2000/01/rdf-schema#Resource",
    "http://www.w3.org/2000/01/rdf-schema#Literal",
  ]);

  const typesToReplace: Record<string, string> = {
    "https://ofn.gov.cz/zdroj/základní-datové-typy/2020-07-01/text":
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
  };

  const applyPrefix = (value: string) => {
    for (const [prefix, name] of Object.entries(prefixes)) {
      if (!value.startsWith(prefix)) {
        continue;
      }
      const suffix = encodeURIComponent(value.substring(prefix.length));
      if (isFragment) {
        return name + ":" + suffix;
      } else {
        // We need to encode ":".
        return name + "%3A" + suffix;
      }
    }
    return value;
  };

  const hashProperty = (profile: string, property: {
    path: string,
    datatype: string | null,
    class: string | null,
  }) => {
    // This is not a good solution, but should be fine for now.
    const type = property.datatype ?? property.class;
    const value = `${profile}:${property.path}:${type}`;
    return computeHash(value);
  };

  // https://github.com/dataspecer/dataspecer/issues/1282
  const sanitizeIri = (iri: string): string => {
    let result = "";
    let encodeHash = false;
    for (let char of iri) {
      if (char === "#") {
        if (encodeHash) {
          result += "%23";
        } else {
          encodeHash = true;
          result += "#";
        }
      } else {
        result += char;
      }
    }
    return result;
  };

  return {
    shaclModelIri: () => baseIri,
    shaclNodeShape: (_profile, type) =>
      sanitizeIri(`${baseIri}${applyPrefix(type)}Shape`),
    shaclPredicateShape: (profile, type, property) => {
      const hash = hashProperty(profile, property);
      return sanitizeIri(`${baseIri}${applyPrefix(type)}Shape/${hash}`);
    },
    nodeTypeFilter: items => items.filter(item => !typesToIgnore.has(item)),
    literalTypeFilter: items => items.filter(item => !typesToIgnore.has(item)),
    prefixes: () => Object.fromEntries(
      Object.entries(prefixes).map(([key, value]) => [value, key]),
    ),
    literalTypeMap: (type) => typesToReplace[type] ?? type,
  }
}

const computeHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
}

