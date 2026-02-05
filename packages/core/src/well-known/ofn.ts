const OFN_TYPE_PREFIX =
  "https://ofn.gov.cz/zdroj/základní-datové-typy/2020-07-01/";

export const OFN = {
  boolean: OFN_TYPE_PREFIX + "boolean",
  date: OFN_TYPE_PREFIX + "datum",
  time: OFN_TYPE_PREFIX + "čas",
  dateTime: OFN_TYPE_PREFIX + "datum-a-čas",
  integer: OFN_TYPE_PREFIX + "celé-číslo",
  decimal: OFN_TYPE_PREFIX + "desetinné-číslo",
  url: OFN_TYPE_PREFIX + "url",
  string: OFN_TYPE_PREFIX + "řetězec",
  text: OFN_TYPE_PREFIX + "text",
  rdfLangString: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
};

export const OFN_LABELS = {
  [OFN.boolean]: {
    cs: "Booleovská hodnota - Ano či ne",
    en: "Boolean",
  },
  [OFN.date]: {
    cs: "Datum",
    en: "Date",
  },
  [OFN.time]: {
    cs: "Čas",
    en: "Time",
  },
  [OFN.dateTime]: {
    cs: "Datum a čas",
    en: "Date and time",
  },
  [OFN.integer]: {
    cs: "Celé číslo",
    en: "Integer",
  },
  [OFN.decimal]: {
    cs: "Desetinné číslo",
    en: "Decimal number",
  },
  [OFN.url]: {
    cs: "URI, IRI, URL",
    en: "URI, IRI, URL",
  },
  [OFN.string]: {
    cs: "Řetězec",
    en: "String",
  },
  [OFN.text]: {
    cs: "Text",
    en: "Text",
  },
  [OFN.rdfLangString]: {
    "cs": "Řetězec anotovaný jazykem",
    "en": "Language tagged string"
  }
};

/**
 * Labels for language-specific property descriptions in JSON schema
 */
export const LANGUAGE_PROPERTY_LABELS = {
  czechLanguage: {
    cs: "Hodnota v českém jazyce",
    en: "Value in Czech language",
  },
  englishLanguage: {
    cs: "Hodnota v anglickém jazyce",
    en: "Value in English language",
  },
  anotherLanguage: {
    cs: "Hodnota v jiném jazyce",
    en: "Value in another language",
  },
  textInGivenLanguage: {
    cs: "Text v daném jazyce",
    en: "Text in given language",
  },
  textLanguage: {
    cs: "Jazyk textu",
    en: "Language of text",
  },
};
