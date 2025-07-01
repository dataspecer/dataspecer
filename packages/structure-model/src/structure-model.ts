
type IRI = string;

export type LanguageString = { [language: string]: string };

export interface StructureModel {

  classes: StructureClass[];

}

interface StructureTerm {

  /**
   * Identifier of the term.
   * For profile based terms this is the IRI of the top profile.
   * For non-profile based terms his is IRI of the vocabulary term.
   */
  iri: IRI;

  name: LanguageString | null;

  nameSource: IRI | null;

  usageNote: LanguageString | null;

  usageNoteSource: IRI | null;

  specializationOf: IRI[];

}

export interface StructureClass extends StructureTerm {

  /**
   * RDF types for given class.
   */
  types: IRI[];

  properties: StructureProperty[];

}

export enum StructurePropertyType {
  /**
   * Is a complex type.
   */
  ComplexProperty = "complex",
  /**
   * Is a primitive type.
   */
  PrimitiveProperty = "primitive",
  /**
   * Is both complex and a primitive type.
   */
  Undecidable = "undecidable",
}

export interface StructureProperty extends StructureTerm {

  type: StructurePropertyType;

  /**
   * RDF predicates for representation of the property relation.
   */
  predicates: IRI[];

  /**
   * Range value must be of all given types.
   */
  range: IRI[];

  rangeCardinality: {

    min: number | null;

    max: number | null;

  };

}
