
export type IRI = string;

export type LanguageString = { [language: string]: string };

export interface OwlOntology {

  classes: OwlClass[];

  properties: OwlProperty[];

}

export interface OwlClass {

  iri: IRI;

  /**
   * @lc-resource http://www.w3.org/2000/01/rdf-schema#label
   */
  name: LanguageString;

  /**
   * @lc-resource http://www.w3.org/2000/01/rdf-schema#comment
   */
  description: LanguageString;

  /**
   * @lc-resource http://www.w3.org/2000/01/rdf-schema#isDefinedBy
   */
  isDefinedBy: IRI;

  /**
   * @lc-resource http://www.w3.org/2000/01/rdf-schema#subClassOf
   */
  subClassOf: IRI[];

}

export enum OwlPropertyType {
  /**
   * @lc-resource http://www.w3.org/2002/07/owl#DatatypeProperty
   */
  DatatypeProperty = "DatatypeProperty",
  /**
   * @lc-resource http://www.w3.org/2002/07/owl#ObjectPropert
   */
  ObjectProperty = "ObjectProperty",
}

export interface OwlProperty {

  iri: IRI;

  /**
   * @lc-resource http://www.w3.org/2000/01/rdf-schema#label
   */
  name: LanguageString;

  /**
   * @lc-resource http://www.w3.org/2000/01/rdf-schema#comment
   */
  description: LanguageString;

  /**
   * @lc-resource http://www.w3.org/2000/01/rdf-schema#isDefinedBy
   */
  isDefinedBy: IRI;

  /**
   * @lc-resource http://www.w3.org/2000/01/rdf-schema#subPropertyOf
   */
  subPropertyOf: IRI[];

  /**
   * @lc-resource http://www.w3.org/2000/01/rdf-schema#domain
   */
  domain: IRI;

  /**
   * @lc-resource http://www.w3.org/2000/01/rdf-schema#range
   */
  range: IRI;

  /**
   * Can be null when type can not be decided.
   *
   * @ls-resource http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  type: OwlPropertyType | null;

}
