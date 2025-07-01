import { Entities, Entity } from "@dataspecer/core-v2";
import {
  ProfileModel,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
  SemanticModelGeneralizationProfile,
  SEMANTIC_MODEL_CLASS_PROFILE,
  SemanticModelRelationshipEndProfile,
  SEMANTIC_MODEL_RELATIONSHIP_PROFILE,
  SEMANTIC_MODEL_GENERALIZATION_PROFILE,
} from "./profile-model.ts";

const OWL_THING = "http://www.w3.org/2002/07/owl#Thing";

type LanguageString = { [language: string]: string };

interface PropertyProfile {

  iri: string;

  name: LanguageString;

  usageNote: LanguageString,

  cardinality: [number, number | null] | null;

}

export interface ProfileModelBuilder {

  class(
    value?: Partial<SemanticModelClassProfile>,
  ): ProfileClassBuilder;

  relationship(
    value?: Partial<SemanticModelRelationshipProfile>,
  ): ProfileRelationshipBuilder;

  property(
    value?: Partial<PropertyProfile>,
  ): ProfileRelationshipBuilder;

  generalization<
    Type extends ProfileClassBuilder | ProfileRelationshipBuilder,
  >(
    parent: Type,
    child: Type,
  ): ProfileGeneralizationBuilder;

  build(): ProfileModel;

}

interface Identifiable {

  identifier: string;

}

export interface ProfileClassBuilder extends Identifiable {

  profile(entity: Identifiable): ProfileClassBuilder;

  reuseName(entity: Identifiable): ProfileClassBuilder;

  reuseDescription(entity: Identifiable): ProfileClassBuilder;

  reuseUsageNote(entity: Identifiable): ProfileClassBuilder;

  optional(): ProfileClassBuilder;

  recommended(): ProfileClassBuilder;

  mandatory(): ProfileClassBuilder;

}

export interface ProfileRelationshipBuilder extends Identifiable {

  profile(entity: Identifiable): ProfileRelationshipBuilder;

  reuseName(entity: Identifiable): ProfileRelationshipBuilder;

  reuseDescription(entity: Identifiable): ProfileRelationshipBuilder;

  reuseUsageNote(entity: Identifiable): ProfileRelationshipBuilder;

  domain(value: ProfileClassBuilder): ProfileRelationshipBuilder;

  range(value: ProfileClassBuilder): ProfileRelationshipBuilder;

  optional(): ProfileClassBuilder;

  recommended(): ProfileClassBuilder;

  mandatory(): ProfileClassBuilder;

}

export interface ProfileGeneralizationBuilder {

}

class DefaultProfileModelBuilder implements ProfileModelBuilder {

  counter: number = 0;

  readonly baseUrl: string;

  readonly entities: Record<string, Entity>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.entities = {};
  }

  class(value?: Partial<SemanticModelClassProfile>): ProfileClassBuilder {
    const identifier = this.nextIdentifier();
    const entity: SemanticModelClassProfile = {
      // Entity
      id: identifier,
      type: [SEMANTIC_MODEL_CLASS_PROFILE],
      // NamedThingProfile
      name: {},
      nameFromProfiled: null,
      description: {},
      descriptionFromProfiled: null,
      // Profile
      profiling: [],
      usageNote: null,
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      // SemanticModelClassProfile
      tags: [],
      ...value,
      // SemanticModelEntity
      iri: this.baseUrl + (value?.iri ?? `classProfile#${this.counter}`),
    };
    this.entities[identifier] = entity;
    return new DefaultProfileClassBuilder(entity);
  }

  nextIdentifier() {
    ++this.counter;
    return this.baseUrl + "000-" + String(this.counter).padStart(3, "0");
  }

  relationship(
    value?: Partial<SemanticModelRelationshipProfile>,
  ): ProfileRelationshipBuilder {
    throw new Error("Method not implemented.");
  }

  property(
    value?: Partial<PropertyProfile>,
  ): ProfileRelationshipBuilder {
    const identifier = this.nextIdentifier();
    const entity: SemanticModelRelationshipProfile = {
      // Entity
      id: identifier,
      type: [SEMANTIC_MODEL_RELATIONSHIP_PROFILE],
      // SemanticModelRelationshipProfile
      ends: [{
        iri: null,
        cardinality: null,
        concept: OWL_THING,
        externalDocumentationUrl: null,
        name: {},
        nameFromProfiled: null,
        description: {},
        descriptionFromProfiled: null,
        usageNote: null,
        usageNoteFromProfiled: null,
        profiling: [],
        tags: [],
      }, {
        iri: this.baseUrl + (value?.iri ?? `relationship#${this.counter}`),
        cardinality: value?.cardinality ?? null,
        concept: OWL_THING,
        externalDocumentationUrl: null,
        name: value?.name ?? {},
        nameFromProfiled: null,
        description: {},
        descriptionFromProfiled: null,
        usageNote: null,
        usageNoteFromProfiled: null,
        profiling: [],
        tags: [],
      }],
    };
    this.entities[identifier] = entity;
    return new DefaultProfileRelationshipBuilder(entity);
  }

  generalization<Type extends ProfileClassBuilder | ProfileRelationshipBuilder>(
    parent: Type, child: Type,
  ): ProfileGeneralizationBuilder {
    const identifier = this.nextIdentifier();
    const entity: SemanticModelGeneralizationProfile = {
      // Entity
      id: identifier,
      type: [SEMANTIC_MODEL_GENERALIZATION_PROFILE],
      // SemanticModelGeneralizationProfile
      child: child.identifier,
      parent: parent.identifier,
      // SemanticModelEntity
      iri: this.baseUrl + `generalizationProfile#${this.counter}`,
    };
    this.entities[identifier] = entity;
    return new DefaultProfileGeneralizationBuilder();
  }

  build(): ProfileModel {
    return new DefaultProfileModel(this.entities);
  }

}

enum ProfileTags {
  "mandatory" = "https://w3id.org/dsv/requirement-level#mandatory",
  "optional" = "https://w3id.org/dsv/requirement-level#optional",
  "recommended" = "https://w3id.org/dsv/requirement-level#recommended",
}

class DefaultProfileClassBuilder implements ProfileClassBuilder {

  readonly identifier: string;

  readonly entity: SemanticModelClassProfile;

  constructor(entity: SemanticModelClassProfile) {
    this.identifier = entity.id;
    this.entity = entity;
  }

  profile(entity: Identifiable): ProfileClassBuilder {
    this.updateProfiling(entity.identifier);
    return this;
  }

  reuseName(entity: Identifiable): ProfileClassBuilder {
    this.entity.nameFromProfiled = entity.identifier;
    this.updateProfiling(entity.identifier);
    return this;
  }

  private updateProfiling(identifier: string) {
    addToArray(identifier, this.entity.profiling);
  }

  reuseDescription(entity: Identifiable): ProfileClassBuilder {
    this.entity.descriptionFromProfiled = entity.identifier;
    this.updateProfiling(entity.identifier);
    return this;
  }

  reuseUsageNote(entity: Identifiable): ProfileClassBuilder {
    this.entity.usageNoteFromProfiled = entity.identifier;
    this.updateProfiling(entity.identifier);
    return this;
  }

  optional(): ProfileClassBuilder {
    addToArray(ProfileTags.optional, this.entity.tags);
    return this;
  }

  recommended(): ProfileClassBuilder {
    addToArray(ProfileTags.recommended, this.entity.tags);
    return this;
  }

  mandatory(): ProfileClassBuilder {
    addToArray(ProfileTags.mandatory, this.entity.tags);
    return this;
  }

}

/**
 * If given value is not in the given array, push it to the end.
 */
function addToArray<T>(value: T, items: T[]) {
  if (items.includes(value)) {
    return;
  }
  items.push(value);
}

class DefaultProfileRelationshipBuilder
  implements ProfileRelationshipBuilder {

  readonly identifier: string;

  readonly entity: SemanticModelRelationshipProfile;

  readonly domainEnd: SemanticModelRelationshipEndProfile;

  readonly rangeEnd: SemanticModelRelationshipEndProfile;

  constructor(entity: SemanticModelRelationshipProfile) {
    this.identifier = entity.id;
    this.entity = entity;
    this.domainEnd = entity.ends[0];
    this.rangeEnd = entity.ends[1];
  }

  profile(entity: Identifiable): ProfileRelationshipBuilder {
    this.updateProfiling(entity.identifier);
    return this;
  }

  reuseName(entity: Identifiable): ProfileRelationshipBuilder {
    this.rangeEnd.nameFromProfiled = entity.identifier;
    this.updateProfiling(entity.identifier);
    return this;
  }

  private updateProfiling(identifier: string) {
    addToArray(identifier, this.rangeEnd.profiling);
  }

  reuseDescription(entity: Identifiable): ProfileRelationshipBuilder {
    this.rangeEnd.descriptionFromProfiled = entity.identifier;
    this.updateProfiling(entity.identifier);
    return this;
  }

  reuseUsageNote(entity: Identifiable): ProfileRelationshipBuilder {
    this.rangeEnd.usageNoteFromProfiled = entity.identifier;
    this.updateProfiling(entity.identifier);
    return this;
  }

  domain(value: ProfileClassBuilder): ProfileRelationshipBuilder {
    this.domainEnd.concept = value.identifier;
    return this;
  }

  range(value: ProfileClassBuilder): ProfileRelationshipBuilder {
    this.rangeEnd.concept = value.identifier;
    return this;
  }

  optional(): ProfileRelationshipBuilder {
    addToArray(ProfileTags.optional, this.rangeEnd.tags);
    return this;
  }

  recommended(): ProfileRelationshipBuilder {
    addToArray(ProfileTags.recommended, this.rangeEnd.tags);
    return this;
  }

  mandatory(): ProfileRelationshipBuilder {
    addToArray(ProfileTags.mandatory, this.rangeEnd.tags);
    return this;
  }

}

class DefaultProfileModel implements ProfileModel {

  entities: Record<string, Entity>;

  constructor(entities: Record<string, Entity>) {
    this.entities = entities;
  }

  getEntities(): Entities {
    return this.entities;
  }

  subscribeToChanges(): () => void {
    throw new Error("Method not implemented.");
  }

  getId(): string {
    throw new Error("Method not implemented.");
  }

  getAlias(): string | null {
    throw new Error("Method not implemented.");
  }

  setAlias(alias: string | null): void {
    throw new Error("Method not implemented.");
  }

}

class DefaultProfileGeneralizationBuilder
  implements ProfileGeneralizationBuilder {

}

export function createDefaultProfileModelBuilder(
  baseUrl: string,
): ProfileModelBuilder {
  return new DefaultProfileModelBuilder(baseUrl);
}
