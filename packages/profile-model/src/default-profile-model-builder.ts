import { createIriResolver } from "@dataspecer/utilities";

import {
  ProfileModel,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
  SemanticModelGeneralizationProfile,
  SEMANTIC_MODEL_CLASS_PROFILE,
  SemanticModelRelationshipEndProfile,
  SEMANTIC_MODEL_RELATIONSHIP_PROFILE,
  SEMANTIC_MODEL_GENERALIZATION_PROFILE,
  ProfileEntity,
} from "./profile-model.ts";
import {
  IdentifiableBuilder,
  ProfileClassBuilder,
  ProfileGeneralizationBuilder,
  ProfileModelBuilder,
  ProfileRelationshipBuilder,
  PropertyProfile,
} from "./profile-model-builder.ts";
import { createReadOnlyInMemoryProfileModel } from "./in-memory/index.ts";

const OWL_THING = "http://www.w3.org/2002/07/owl#Thing";

type Resolver = (iri: string) => string;

class DefaultProfileModelBuilder implements ProfileModelBuilder {

  counter: number = 0;

  readonly identifier: string;

  readonly baseUrl: string | null;

  readonly urlResolver: Resolver;

  readonly identifierResolver: Resolver;

  readonly entities: Record<string, ProfileEntity>;

  constructor(
    identifier: string,
    baseUrl: string | null,
    urlResolver: Resolver,
    identifierResolver: Resolver,
  ) {
    this.identifier = identifier;
    this.baseUrl = baseUrl;
    this.urlResolver = urlResolver;
    this.identifierResolver = identifierResolver
    this.entities = {};
  }

  class(value?: Partial<SemanticModelClassProfile>): ProfileClassBuilder {
    const identifier = value?.id ?? this.nextIdentifier();
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
      iri: this.urlResolver(value?.iri ?? `classProfile#${this.counter}`),
    };
    this.entities[identifier] = entity;
    return new DefaultProfileClassBuilder(entity);
  }

  nextIdentifier() {
    ++this.counter;
    return this.identifierResolver(String(this.counter).padStart(3, "0"));
  }

  relationship(
    value?: Partial<SemanticModelRelationshipProfile>,
  ): ProfileRelationshipBuilder {
    throw new Error("Method not implemented.");
  }

  property(
    value?: Partial<PropertyProfile & { id: string }>,
  ): ProfileRelationshipBuilder {
    const identifier = value?.id ?? this.nextIdentifier();
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
        name: null,
        nameFromProfiled: null,
        description: null,
        descriptionFromProfiled: null,
        usageNote: null,
        usageNoteFromProfiled: null,
        profiling: [],
        tags: [],
      }, {
        iri: this.urlResolver(value?.iri ?? `relationship#${this.counter}`),
        cardinality: value?.cardinality ?? null,
        concept: OWL_THING,
        externalDocumentationUrl: null,
        name: value?.name ?? null,
        nameFromProfiled: null,
        description: null,
        descriptionFromProfiled: null,
        usageNote: value?.usageNote ?? null,
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
      iri: this.urlResolver(`generalizationProfile#${this.counter}`),
    };
    this.entities[identifier] = entity;
    return new DefaultProfileGeneralizationBuilder();
  }

  build(): ProfileModel {
    return createReadOnlyInMemoryProfileModel(
      this.identifier, this.baseUrl, this.entities);
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

  profile(entity: IdentifiableBuilder): ProfileClassBuilder {
    this.updateProfiling(entity.identifier);
    return this;
  }

  reuseName(entity: IdentifiableBuilder): ProfileClassBuilder {
    this.entity.nameFromProfiled = entity.identifier;
    this.updateProfiling(entity.identifier);
    return this;
  }

  private updateProfiling(identifier: string) {
    addToArray(identifier, this.entity.profiling);
  }

  reuseDescription(entity: IdentifiableBuilder): ProfileClassBuilder {
    this.entity.descriptionFromProfiled = entity.identifier;
    this.updateProfiling(entity.identifier);
    return this;
  }

  reuseUsageNote(entity: IdentifiableBuilder): ProfileClassBuilder {
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

  profile(entity: IdentifiableBuilder): ProfileRelationshipBuilder {
    this.updateProfiling(entity.identifier);
    return this;
  }

  reuseName(entity: IdentifiableBuilder): ProfileRelationshipBuilder {
    this.rangeEnd.nameFromProfiled = entity.identifier;
    this.updateProfiling(entity.identifier);
    return this;
  }

  private updateProfiling(identifier: string) {
    addToArray(identifier, this.rangeEnd.profiling);
  }

  reuseDescription(entity: IdentifiableBuilder): ProfileRelationshipBuilder {
    this.rangeEnd.descriptionFromProfiled = entity.identifier;
    this.updateProfiling(entity.identifier);
    return this;
  }

  reuseUsageNote(entity: IdentifiableBuilder): ProfileRelationshipBuilder {
    this.rangeEnd.usageNoteFromProfiled = entity.identifier;
    this.updateProfiling(entity.identifier);
    return this;
  }

  domain(value: ProfileClassBuilder): ProfileRelationshipBuilder {
    this.domainEnd.concept = value.identifier;
    return this;
  }

  range(value: ProfileClassBuilder | string): ProfileRelationshipBuilder {
    if (typeof value === "string") {
      this.rangeEnd.concept = value;
    } else {
      this.rangeEnd.concept = value.identifier;
    }
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

class DefaultProfileGeneralizationBuilder
  implements ProfileGeneralizationBuilder {

}

export function createDefaultProfileModelBuilder(configuration: {
  baseIdentifier: string,
  baseUrl: string | null,
  /**
   * When true the relative URL of entities are resolved.
   */
  resolveUrl?: boolean,
}): ProfileModelBuilder {
  const urlResolver: Resolver =
    configuration.resolveUrl === true && configuration.baseUrl !== null
      ? createIriResolver(configuration.baseUrl)
      : iri => iri;
  return new DefaultProfileModelBuilder(
    configuration.baseIdentifier, configuration.baseUrl,
    urlResolver, (identifier) => configuration.baseIdentifier + identifier,
  );
}
