
const XsdSimpleTypeURIs = [
    "http://www.w3.org/2001/XMLSchema#string",
    "http://www.w3.org/2001/XMLSchema#token",
    "http://www.w3.org/2001/XMLSchema#boolean",
    "http://www.w3.org/2001/XMLSchema#decimal",
    "http://www.w3.org/2001/XMLSchema#integer",
    "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
    "http://www.w3.org/2001/XMLSchema#float",
    "http://www.w3.org/2001/XMLSchema#double",
    "http://www.w3.org/2001/XMLSchema#date",
    "http://www.w3.org/2001/XMLSchema#gYear",
    "http://www.w3.org/2001/XMLSchema#time",
    "http://www.w3.org/2001/XMLSchema#dateTime",
    "http://www.w3.org/2001/XMLSchema#duration",
    "http://www.w3.org/2001/XMLSchema#base64Binary",
    "http://www.w3.org/2001/XMLSchema#hexBinary",
    "http://www.w3.org/2001/XMLSchema#anyURI",
    "http://www.w3.org/2001/XMLSchema#QName",
];

const RdfTypeURIs = [
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
];

const RdfsTypeURIs = [
    "http://www.w3.org/2000/01/rdf-schema#Literal",
];

const SGovTypeURIs = [
    "https://ofn.gov.cz/zdroj/základní-datové-typy/2020-07-01/text",
];

export const DataTypeURIs = [
    ...XsdSimpleTypeURIs,
    ...RdfTypeURIs,
    ...RdfsTypeURIs,
    ...SGovTypeURIs,
];

const PRIMITIVE_TYPES: Set<string> = new Set([
    ...DataTypeURIs,
]);

/**
 * owl:Thing can be primitive as well as complex type.
 */
const OWL_THING = "https://www.w3.org/2002/07/owl#Thing";

export function isPrimitiveType(iri: string): boolean {
    if(iri === OWL_THING) {
        return true;
    }
    return PRIMITIVE_TYPES.has(iri);
}

export function isComplexType(iri: string): boolean {
    if(iri === OWL_THING) {
        return true;
    }
    return !PRIMITIVE_TYPES.has(iri);
}

/**
 * @deprecated
 */
export const isXsdSimpleDataType = (uri: string) => {
    return XsdSimpleTypeURIs.includes(uri);
};

/**
 * @deprecated
 */
export const isRdfDataType = (uri: string) => {
    return RdfTypeURIs.includes(uri);
};

/**
 * @deprecated
 */
export const isDataType = (uri: string | null): uri is string => {
    if (!uri) {
        return false;
    }
    return isXsdSimpleDataType(uri) || isRdfDataType(uri) || uri === "http://www.w3.org/2000/01/rdf-schema#Literal" || uri.startsWith("https://ofn.gov.cz/zdroj/základní-datové-typy/"); // || isOtherDataType(uri)...
};
