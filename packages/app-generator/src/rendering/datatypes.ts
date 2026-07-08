import { OFN } from '@dataspecer/core/well-known';
import type { SupportedDataTypes } from 'ldkit';
import { xsd } from 'ldkit/namespaces';

type LdkitDatatype = keyof SupportedDataTypes;

/**
 * Maps a Dataspecer attribute datatype to how it is represented across the generated code, so
 * the LDKit schema type, the model TypeScript type, and the empty form value all derive from one
 * table and cannot drift.
 *
 * The datatype IRIs come from Dataspecer, so the keys reuse Dataspecer's OFN base types and the
 * xsd namespace. The emitted @type reuses LDKit's xsd namespace, which is the set of datatypes
 * LDKit knows how to parse, so the model type stays consistent with what a read returns.
 * Language tagged values (OFN.text or rdf:langString) are read through @multilang as a language
 * to value map, the same signal Dataspecer uses when it emits @container @language.
 */

export interface DatatypeMapping {
  /**
   * The datatype to emit as the LDKit @type, typed as one of the datatypes LDKit can parse.
   * Undefined leaves the value as a plain string, the safe fallback for unrecognized or generic
   * literal types.
   */
  ldkitType?: LdkitDatatype;
  /** Language tagged values, read by LDKit through @multilang as a language to value map. */
  multilang?: boolean;
  /** The value type in the generated model, matching what LDKit returns for the datatype. */
  tsType: string;
  /** Expression for an empty value, used by the generated createEmpty helpers. */
  emptyValue: string;
}

function literal(ldkitType: LdkitDatatype, tsType: string, emptyValue: string): DatatypeMapping {
  return { ldkitType, tsType, emptyValue };
}

const MULTILANG: DatatypeMapping = {
  multilang: true,
  tsType: 'Record<string, string>',
  emptyValue: '{}',
};

// The xsd groups mirror how LDKit maps datatypes to native values, so the model type is correct.
const NUMBER_TYPES = [
  xsd.integer,
  xsd.decimal,
  xsd.float,
  xsd.double,
  xsd.long,
  xsd.int,
  xsd.byte,
  xsd.short,
  xsd.negativeInteger,
  xsd.nonNegativeInteger,
  xsd.nonPositiveInteger,
  xsd.positiveInteger,
  xsd.unsignedByte,
  xsd.unsignedInt,
  xsd.unsignedLong,
  xsd.unsignedShort,
];
const DATE_TYPES = [xsd.dateTime, xsd.date, xsd.gDay, xsd.gMonthDay, xsd.gYear, xsd.gYearMonth];
const STRING_TYPES = [
  xsd.string,
  xsd.normalizedString,
  xsd.anyURI,
  xsd.base64Binary,
  xsd.language,
  xsd.Name,
  xsd.NCName,
  xsd.NMTOKEN,
  xsd.token,
  xsd.hexBinary,
  xsd.time,
  xsd.duration,
];

const TABLE = new Map<string, DatatypeMapping>();
for (const iri of NUMBER_TYPES) {
  TABLE.set(iri, literal(iri, 'number', '0'));
}
for (const iri of DATE_TYPES) {
  TABLE.set(iri, literal(iri, 'Date', 'new Date()'));
}
for (const iri of STRING_TYPES) {
  TABLE.set(iri, literal(iri, 'string', '""'));
}
TABLE.set(xsd.boolean, literal(xsd.boolean, 'boolean', 'false'));

// OFN base types map onto their xsd equivalents, which LDKit understands.
TABLE.set(OFN.boolean, literal(xsd.boolean, 'boolean', 'false'));
TABLE.set(OFN.date, literal(xsd.date, 'Date', 'new Date()'));
TABLE.set(OFN.time, literal(xsd.time, 'string', '""'));
TABLE.set(OFN.dateTime, literal(xsd.dateTime, 'Date', 'new Date()'));
TABLE.set(OFN.integer, literal(xsd.integer, 'number', '0'));
TABLE.set(OFN.decimal, literal(xsd.decimal, 'number', '0'));
TABLE.set(OFN.url, literal(xsd.anyURI, 'string', '""'));
TABLE.set(OFN.string, literal(xsd.string, 'string', '""'));
// OFN.rdfLangString is the rdf:langString IRI, so this also covers a raw langString datatype.
TABLE.set(OFN.text, MULTILANG);
TABLE.set(OFN.rdfLangString, MULTILANG);

// Unrecognized and generic literal datatypes such as rdfs:Literal read as plain strings.
const FALLBACK: DatatypeMapping = { tsType: 'string', emptyValue: '""' };

export function datatypeMapping(datatype: string | undefined): DatatypeMapping {
  return (datatype && TABLE.get(datatype)) || FALLBACK;
}
