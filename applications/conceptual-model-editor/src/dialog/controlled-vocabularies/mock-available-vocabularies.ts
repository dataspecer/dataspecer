import { ControlledVocabulary } from "./controlled-vocabulary-model";

/**
 * Stand-in for controlled vocabularies loaded via the controlled vocabulary
 * model / CV manager integration, which is not wired up yet. Used to drive
 * the class-profile dialog demo until that integration lands.
 */
export const MOCK_AVAILABLE_VOCABULARIES: ControlledVocabulary[] = [
  {
    id: "eurovoc",
    name: "EuroVoc",
    iri: "http://eurovoc.europa.eu/",
    regex: "^.*$",
    downloadUrl: "https://example.com/eurovoc.rdf",
    docsUrl: "https://eurovoc.europa.eu/",
  },
  {
    id: "geonames",
    name: "GeoNames Feature Codes",
    iri: "http://www.geonames.org/",
    regex: "^.*$",
    downloadUrl: "https://example.com/geonames.rdf",
    docsUrl: "https://www.geonames.org/export/codes.html",
  },
  {
    id: "dcmitype",
    name: "Dublin Core Types",
    iri: "http://purl.org/dc/dcmitype/",
    regex: "^.*$",
    downloadUrl: "https://example.com/dcmitype.rdf",
    docsUrl: "https://www.dublincore.org/specifications/dublin-core/dcmi-type-vocabulary/",
  },
  {
    id: "skos-concept-scheme",
    name: "SKOS Concept Scheme",
    iri: "http://www.w3.org/2004/02/skos/core#",
    regex: "^.*$",
    downloadUrl: "https://example.com/skos.rdf",
    docsUrl: "https://www.w3.org/TR/skos-reference/",
  },
];
