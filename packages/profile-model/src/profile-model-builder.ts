import type {
  ProfileModel,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "./profile-model.ts";

type LanguageString = { [language: string]: string };

export interface ProfileModelBuilder {

  class(
    value?: Partial<SemanticModelClassProfile>,
  ): ProfileClassBuilder;

  relationship(
    value?: Partial<SemanticModelRelationshipProfile>,
  ): ProfileRelationshipBuilder;

  property(
    value?: Partial<PropertyProfile & { id: string }>,
  ): ProfileRelationshipBuilder;

  generalization<
    Type extends ProfileClassBuilder | ProfileRelationshipBuilder,
  >(
    parent: Type,
    child: Type,
  ): ProfileGeneralizationBuilder;

  build(): ProfileModel;

}

export interface PropertyProfile {

  iri: string;

  name: LanguageString;

  usageNote: LanguageString,

  cardinality: [number, number | null] | null;

}

export interface ProfileClassBuilder extends IdentifiableBuilder {

  profile(entity: IdentifiableBuilder): ProfileClassBuilder;

  reuseName(entity: IdentifiableBuilder): ProfileClassBuilder;

  reuseDescription(entity: IdentifiableBuilder): ProfileClassBuilder;

  reuseUsageNote(entity: IdentifiableBuilder): ProfileClassBuilder;

  optional(): ProfileClassBuilder;

  recommended(): ProfileClassBuilder;

  mandatory(): ProfileClassBuilder;

}

export interface IdentifiableBuilder {

  /**
   * Provides ability to identify a builder.
   */
  identifier: string;

}

export interface ProfileRelationshipBuilder extends IdentifiableBuilder {

  profile(entity: IdentifiableBuilder): ProfileRelationshipBuilder;

  reuseName(entity: IdentifiableBuilder): ProfileRelationshipBuilder;

  reuseDescription(entity: IdentifiableBuilder): ProfileRelationshipBuilder;

  reuseUsageNote(entity: IdentifiableBuilder): ProfileRelationshipBuilder;

  domain(value: ProfileClassBuilder): ProfileRelationshipBuilder;

  /**
   * @param value Use IRI for primitive types.
   */
  range(value: ProfileClassBuilder | string): ProfileRelationshipBuilder;

  optional(): ProfileClassBuilder;

  recommended(): ProfileClassBuilder;

  mandatory(): ProfileClassBuilder;

}

export interface ProfileGeneralizationBuilder {

}
