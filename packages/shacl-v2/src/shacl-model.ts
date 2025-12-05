
/**
 * BlankNode or Named node.
 */
type Node = string;

/**
 * Node or a Literal.
 */
type Resource = string

type LanguageString = { [language: string]: string };

export interface ShaclModel {

  iri: Node;

  /**
   * @lc-identifier rdfs:member
   */
  members: ShaclNodeShape[];

}

/**
 * Represents a SHACL Node Shape.
 *
 * @lc-identifier shacl:NodeShape
 */
export interface ShaclNodeShape {

  iri: Node;

  /**
   * @lc-identifier rdfs:seeAlso
   */
  seeAlso: string;

  /**
   * @lc-identifier shacl:closed
   */
  closed: boolean | null;

  /**
   * The target class for this shape.
   * @lc-identifier shacl:targetClass
   */
  targetClass: Node | null;

  /**
   * List of property shapes.
   * @lc-identifier shacl:property
   */
  propertyShapes: ShaclPropertyShape[];

}

/**
 * Represents a SHACL Property Shape.
 */
export interface ShaclPropertyShape {

  /**
   * Unique identifier for the property shape.
   */
  iri: Node;

  /**
   * @lc-identifier rdfs:seeAlso
   */
  seeAlso: Resource | null;

  /**
   * @lc-identifier shacl:description
   */
  description: LanguageString | null;

  /**
   * @lc-identifier shacl:name
   */
  name: LanguageString | null;

  /**
   * Kind of node.
   *
   * @lc-identifier shacl:nodeKind.
   */
  nodeKind: ShaclNodeKind | null;

  /**
   * The property path.
   *
   * @lc-identifier shacl:path
   */
  path: Node;

  /**
   * Minimum number of occurrences.
   *
   * @lc-identifier shacl:minCount
   */
  minCount: number | null;

  /**
   * Maximum number of occurrences.
   *
   * @lc-identifier shacl:maxCount
   */
  maxCount: number | null;

  /**
   * Expected datatype of the property.
   *
   * @lc-identifier shacl:datatype
   */
  datatype: Node | null;

  /**
   * Expected class of the property value.
   *
   * @lc-identifier shacl:class
   */
  class: Node | null;

}

/**
 * Enum for SHACL Node Kinds.
 */
export enum ShaclNodeKind {
  IRI = "IRI",
  BlankNode = "BlankNode",
  Literal = "Literal",
  BlankNodeOrIRI = "BlankNodeOrIRI",
  BlankNodeOrLiteral = "BlankNodeOrLiteral",
  IRIOrLiteral = "IRIOrLiteral",
}
