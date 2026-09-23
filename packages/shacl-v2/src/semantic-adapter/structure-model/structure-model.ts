import { RequirementLevel } from "@dataspecer/data-specification-vocabulary/semantic-model";
import { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";

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

  name: LanguageString;

  nameSource: IRI | null;

  description: LanguageString;

  descriptionSource: IRI | null;

  usageNote: LanguageString;

  usageNoteSource: IRI | null;

  specializationOf: IRI[];

}

export interface StructureClass extends StructureTerm {

  /**
   * RDF types for given class.
   */
  rdfTypes: IRI[];

  properties: StructureProperty[];

  /**
   * Controlled vocabulary assignments declared directly on this class.
   * Does not include assignments inherited via {@link specializationOf} -
   * inheritance is resolved later, during SHACL shape construction.
   */
  controlledVocabularyAssignments: StructureControlledVocabularyAssignment[];

}

export interface StructureControlledVocabularyAssignment {

  /**
   * This assignment's own IRI, used to match against another
   * assignment's {@link replaces}.
   */
  iri: IRI;

  /**
   * Resolved IRI of the assigned controlled vocabulary.
   */
  controlledVocabularyIri: IRI;

  /**
   * Resolved {@link ControlledVocabulary.pattern} of the assigned
   * vocabulary, or `null` if it could not be resolved.
   */
  pattern: string | null;

  /**
   * How strictly the vocabulary is expected to be used.
   */
  usageExpectation: Qualifier | null;

  /**
   * IRI of the assignment this one replaces, i.e. overrides when
   * inherited via {@link StructureTerm.specializationOf}.
   */
  replaces: IRI | null;

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
  rdfPredicates: IRI[];

  /**
   * Range value must be of all given types.
   */
  range: IRI[];

  rangeCardinality: {

    min: number | null;

    max: number | null;

  };

  requirementLevel: RequirementLevel;

}
