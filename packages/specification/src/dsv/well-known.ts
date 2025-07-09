export const DSV_KNOWN_FORMATS = {
  rdf: "http://publications.europa.eu/resource/authority/file-type/RDF_TURTLE",
  svg: "http://publications.europa.eu/resource/authority/file-type/SVG",
  html: "http://publications.europa.eu/resource/authority/file-type/HTML",
};

export const DSV_CONFORMS_TO = {
  svg: "https://www.w3.org/TR/SVG/",
  jsonSchema: "https://json-schema.org/draft/2020-12/schema",
  jsonLd: "http://www.w3.org/ns/json-ld",
};

export const OWL_BASE = "http://www.w3.org/2002/07/owl";
export const OWL = {
  Ontology: "http://www.w3.org/2002/07/owl#Ontology",
};

export const PROF = {
  Profile: "http://www.w3.org/ns/dx/prof/Profile",
  ResourceDescriptor: "http://www.w3.org/ns/dx/prof/ResourceDescriptor",

  hasResource: "http://www.w3.org/ns/dx/prof/hasResource",
  hasRole: "http://www.w3.org/ns/dx/prof/hasRole",
  isProfileOf: "http://www.w3.org/ns/dx/prof/isProfileOf",
  hasToken: "http://www.w3.org/ns/dx/prof/hasToken",
  hasArtifact: "http://www.w3.org/ns/dx/prof/hasArtifact",

  ROLE: {
    Guidance: "http://www.w3.org/ns/dx/prof/role/Guidance",
    Specification: "http://www.w3.org/ns/dx/prof/role/Specification",
    Vocabulary: "http://www.w3.org/ns/dx/prof/role/Vocabulary",
    Schema: "http://www.w3.org/ns/dx/prof/role/schema",
  },
};

export const DSV = {
  ApplicationProfile: "https://w3id.org/dsv#ApplicationProfile",
  ApplicationProfileSpecificationDocument: "https://w3id.org/dsv#ApplicationProfileSpecificationDocument",
  VocabularySpecificationDocument: "https://w3id.org/dsv#VocabularySpecificationDocument",
};

export const ADMS = {
  AssetDistribution: "http://www.w3.org/ns/adms#AssetDistribution",
};

export const RDFS_BASE = "http://www.w3.org/2000/01/rdf-schema#";

export const knownPrefixes = {
  filetype: "http://publications.europa.eu/resource/authority/file-type/",
  dsv: "https://w3id.org/dsv#",
  prof: "http://www.w3.org/ns/dx/prof/",
  role: "http://www.w3.org/ns/dx/prof/role/",
  owl: "http://www.w3.org/2002/07/owl#",
  adms: "http://www.w3.org/ns/adms#",
};