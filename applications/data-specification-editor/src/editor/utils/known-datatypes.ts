import { type SemanticModelClass } from "@dataspecer/core-v2/semantic-model/concepts";
import { LanguageString } from "@dataspecer/core/core";

export interface KnownDatatype {
  label?: LanguageString;
  prefix?: string;
  localPart?: string;
  documentation?: string;
  iri: string;
}

/**
 * Returns true for classes that are sf:Geometry or sf:Envelope. Current
 * behavior is to treat these two objects as primitives because they have
 * specific behavior in generators.
 *
 * In the future, we might have other objects from other areas that may need
 * similar behavior. Then I suppose we would need to rethink this function to be
 * more generic, e.g. isHardcodedDataType or something like that.
 *
 * @param concept IRI as string or SemanticModelClass as the concept if
 * available.
 */
export function isGeometryTypeObject(concept: string | SemanticModelClass): boolean {
  const conceptIris: string[] = [];

  if (typeof concept === "string") {
    conceptIris.push(concept);
  } else {
    conceptIris.push(concept.id); // local identifier of the class
    conceptIris.push(concept.iri); // public iri if exists

    const withConceptIris = concept as SemanticModelClass & { conceptIris?: string[] };
    if (withConceptIris.conceptIris) {
      conceptIris.push(...withConceptIris.conceptIris);
    }
  }

  // todo now thanks to conceptIris we can handle profiling, but we still have to check class hierarchy wich we do not do!
  const toFindTypes = ["http://www.opengis.net/ont/sf#Geometry", "http://www.opengis.net/ont/sf#Envelope"];

  return toFindTypes.some((type) => conceptIris.includes(type));
}

export const knownDatatypes: KnownDatatype[] = [
  {
    iri: "http://www.w3.org/2000/01/rdf-schema#Literal",
    documentation: "http://www.w3.org/2000/01/rdf-schema#Literal",
    label: {
      cs: "Jakýkoli typ",
      en: "Any type",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#boolean",
    documentation: "https://ofn.gov.cz/základní-datové-typy/2020-07-01/#boolean",
    label: {
      cs: "Booleovská hodnota - Ano či ne",
      en: "Boolean",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#date",
    documentation: "https://ofn.gov.cz/základní-datové-typy/2020-07-01/#datum",
    label: {
      cs: "Datum",
      en: "Date",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#time",
    documentation: "https://ofn.gov.cz/základní-datové-typy/2020-07-01/#čas",
    label: {
      cs: "Čas",
      en: "Time",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#dateTime",
    documentation: "https://ofn.gov.cz/základní-datové-typy/2020-07-01/#datum-a-čas",
    label: {
      cs: "Datum a čas",
      en: "Date and time",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#dateTimeStamp",
    documentation: "https://ofn.gov.cz/základní-datové-typy/2020-07-01/#datum-a-čas",
    label: {
      cs: "Časové razítko",
      en: "Timestamp",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#gYear",
    documentation: "http://www.w3.org/2001/XMLSchema#gYear",
    label: {
      cs: "Gregoriánský rok",
      en: "Gregorian year",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#integer",
    documentation: "https://ofn.gov.cz/základní-datové-typy/2020-07-01/#celé-číslo",
    label: {
      cs: "Celé číslo",
      en: "Integer",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
    documentation: "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
    label: {
      cs: "Nezáporné celé číslo",
      en: "Non-negative integer",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#decimal",
    documentation: "https://ofn.gov.cz/základní-datové-typy/2020-07-01/#desetinné-číslo",
    label: {
      cs: "Desetinné číslo",
      en: "Decimal number",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#duration",
    documentation: "http://www.w3.org/2001/XMLSchema#duration",
    label: {
      cs: "Doba trvání",
      en: "Duration",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#anyURI",
    documentation: "https://ofn.gov.cz/základní-datové-typy/2020-07-01/#url",
    label: {
      cs: "URI, IRI, URL",
      en: "URI, IRI, URL",
    },
  },
  // Normal string
  {
    iri: "http://www.w3.org/2001/XMLSchema#string",
    documentation: "https://ofn.gov.cz/základní-datové-typy/2020-07-01/#řetězec",
    label: {
      cs: "Řetězec",
      en: "String",
    },
  },
  // Dictionary with one string per key=language
  {
    iri: "https://ofn.gov.cz/zdroj/základní-datové-typy/2020-07-01/text",
    documentation: "https://ofn.gov.cz/základní-datové-typy/2020-07-01/#text",
    label: {
      cs: "Text",
      en: "Text",
    },
  },
  // RDF language string - string with given language tag
  {
    iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
    documentation: "https://www.w3.org/TR/rdf11-schema/#ch_langstring",
    label: {
      cs: "Řetězec anotovaný jazykem",
      en: "Language tagged string",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#base64Binary",
    documentation: "https://www.w3.org/TR/xmlschema-2/#base64Binary",
    label: {
      cs: "Base64 kódovaný binární obsah",
      en: "Base64 encoded binary content",
    },
  },
  {
    iri: "http://www.w3.org/2001/XMLSchema#hexBinary",
    documentation: "https://www.w3.org/TR/xmlschema-2/#hexBinary",
    label: {
      cs: "Hex kódovaný binární obsah",
      en: "Hex encoded binary content",
    },
  },
  {
    iri: "http://www.opengis.net/ont/geosparql#wktLiteral",
    documentation: "http://www.opengis.net/ont/geosparql#wktLiteral",
    label: {
      cs: "WKT - Well-Known Text",
      en: "WKT - Well-Known Text",
    },
  },
  {
    iri: "http://www.opengis.net/ont/geosparql#gmlLiteral",
    documentation: "http://www.opengis.net/ont/geosparql#gmlLiteral",
    label: {
      cs: "GML - Geography Markup Language",
      en: "GML - Geography Markup Language",
    },
  },
  {
    iri: "http://www.opengis.net/ont/geosparql#geoJSONLiteral",
    documentation: "http://www.opengis.net/ont/geosparql#geoJSONLiteral",
    label: {
      cs: "GeoJSON",
      en: "GeoJSON",
    },
  },
];
