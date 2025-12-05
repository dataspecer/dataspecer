import {
  SemanticModelClass,
  SemanticModelGeneralization,
  SemanticModelRelationship,
  SemanticModel,
} from "./semantic-model.ts";

type LanguageString = { [language: string]: string };

export interface SemanticModelBuilder {

  class(
    value?: Partial<SemanticModelClass>,
  ): SemanticClassBuilder;

  /**
   * Alternative to {@link relationship}.
   */
  property(
    value?: Partial<SemanticModelProperty>,
  ): SemanticRelationshipBuilder;

  generalization(value: {
    id?: string;
    child: string;
    parent: string;
  }): SemanticGeneralizationBuilder;

  build(): SemanticModel;

}

export interface SemanticClassBuilder extends IdentifiableBuilder {

  /**
   * @returns Full IRI of this class.
   */
  absoluteIri(): string;

  /**
   * Create a relation with this class as the domain.
   */
  property(value: {
    id?: string,
    iri?: string,
    name?: LanguageString,
    description?: LanguageString,
    range: IdentifiableBuilder,
  }): SemanticRelationshipBuilder;

  /**
   * Add generalization where this class is generalization of the given class.
   */
  specializationOf(value: {
    id?: string,
    parent: IdentifiableBuilder,
  }): SemanticGeneralizationBuilder;

  build(): SemanticModelClass;

}

export interface IdentifiableBuilder {

  /**
   * Provides ability to identify a builder.
   */
  identifier: string;

}

export interface SemanticRelationshipBuilder extends IdentifiableBuilder {

  domain(value: IdentifiableBuilder): SemanticRelationshipBuilder;

  range(value: IdentifiableBuilder): SemanticRelationshipBuilder;

  build(): SemanticModelRelationship;

}

export interface SemanticModelProperty {

  id: string;

  iri: string;

  name: LanguageString;

  description: LanguageString;

  externalDocumentationUrl: string | null;

}

export interface SemanticGeneralizationBuilder extends IdentifiableBuilder {

}
