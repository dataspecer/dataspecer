export interface SimplifiedSemanticModel {
  classes: Class[];
  attributes: Relationship[];
  relationships: Relationship[];
  generalizations: Generalization[];
}

export type Cardinality = "optional-one" | "one" | "many";

interface Class {
  iri: string;
  title: string;
  description: string;
}

interface Relationship {
  iri: string;
  title: string;
  description: string;

  domain: string;
  domainCardinality: Cardinality;

  range: string;
  rangeCardinality: Cardinality;
}

interface Generalization {
  iri: string;
  title: string;
  description: string;

  generalClass: string;
  specialClass: string;
}
