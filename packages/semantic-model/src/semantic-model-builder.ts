import { IRI } from "iri";

import {
  SEMANTIC_MODEL_CLASS,
  SemanticModelClass,
  SemanticModelGeneralization,
  SemanticModelRelationship,
  SemanticModel,
  SEMANTIC_MODEL_RELATIONSHIP,
  SemanticModelRelationshipEnd,
  SemanticEntity,
} from "./semantic-model.ts";
import { createReadOnlyInMemoryProfileModel } from "./in-memory/index.ts";


type LanguageString = { [language: string]: string };

export interface SemanticModelBuilder {

  class(
    value?: Partial<SemanticModelClass>,
  ): SemanticClassBuilder;

  relationship(
    value?: Partial<SemanticModelRelationship>,
  ): SemanticRelationshipBuilder;

  /**
   * Alternative to {@link relationship}.
   */
  property(
    value?: Partial<SemanticModelProperty>,
  ): SemanticRelationshipBuilder;

  generalization(
    value?: Partial<SemanticModelGeneralization>,
  ): SemanticGeneralizationBuilder;

  build(identifier: string): SemanticModel;

}

export interface SemanticClassBuilder extends Identifiable {

  /**
   * Create a relation with this class as the domain.
   */
  property(value: {
    iri?: string,
    name?: LanguageString,
    description?: LanguageString,
    range: Identifiable,
  }): SemanticRelationshipBuilder;

  build(): SemanticModelClass;

}

interface Identifiable {

  identifier: string;

}

export interface SemanticRelationshipBuilder extends Identifiable {

  domain(value: Identifiable): SemanticRelationshipBuilder;

  range(value: Identifiable): SemanticRelationshipBuilder;

  build(): SemanticModelRelationship;

}

interface SemanticModelProperty {

  iri: string;

  name: LanguageString;

  description: LanguageString;

  externalDocumentationUrl: string | null;

}

export interface SemanticGeneralizationBuilder extends Identifiable {

  generalization<Type extends SemanticClassBuilder | SemanticRelationshipBuilder>(
    parent: Type, child: Type,
  ): SemanticRelationshipBuilder;

  build(): SemanticModelGeneralization;

}

type UrlResolver = (iri: string) => string;

class DefaultSemanticModelBuilder implements SemanticModelBuilder {

  counter: number = 0;

  readonly baseUrl: string;

  readonly urlResolver: UrlResolver;

  readonly entities: Record<string, SemanticEntity>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.urlResolver = createUrlResolver(baseUrl);
    this.entities = {};
  }

  class(value?: Partial<SemanticModelClass>): SemanticClassBuilder {
    const identifier = this.nextIdentifier();
    const entity: SemanticModelClass = {
      // Entity
      id: identifier,
      type: [SEMANTIC_MODEL_CLASS],
      // NamedThing
      name: {},
      description: {},
      // SemanticModelClass
      externalDocumentationUrl: undefined,
      ...value,
      // SemanticModelEntity
      iri: this.urlResolver(value?.iri ?? `class#${this.counter}`),
    };
    this.entities[identifier] = entity;
    return new DefaultSemanticClassBuilder(this, entity);
  }

  nextIdentifier() {
    ++this.counter;
    return this.urlResolver("000-" + String(this.counter).padStart(3, "0"));
  }

  relationship(
    value?: Partial<SemanticModelRelationship>,
  ): SemanticRelationshipBuilder {
    throw new Error("Method not implemented.");
  }

  property(
    value?: Partial<SemanticModelProperty>,
  ): SemanticRelationshipBuilder {
    const identifier = this.nextIdentifier();
    const entity: SemanticModelRelationship = {
      // Entity
      id: identifier,
      type: [SEMANTIC_MODEL_RELATIONSHIP],
      // NamedThing
      name: {},
      description: {},
      // SemanticModelEntity
      iri: null,
      ends: [{
        iri: null,
        cardinality: undefined,
        concept: null,
        externalDocumentationUrl: null,
        name: {},
        description: {},
      }, {
        iri: this.urlResolver(value?.iri ?? `relationship#${this.counter}`),
        cardinality: undefined,
        concept: null,
        externalDocumentationUrl: value?.externalDocumentationUrl ?? null,
        name: value?.name ?? {},
        description: {},
      }],
    };
    this.entities[identifier] = entity;
    return new DefaultSemanticRelationshipBuilder(entity);
  }

  generalization(
    value?: Partial<SemanticModelGeneralization>,
  ): SemanticGeneralizationBuilder {
    throw new Error("Method not implemented.");
  }

  build(identifier: string): SemanticModel {
    return createReadOnlyInMemoryProfileModel(
      identifier, this.baseUrl, this.entities);
  }

}

function createUrlResolver(baseUrl: string): UrlResolver {
  return (iri: string) => {
    return isAbsoluteIri(iri) ? iri : baseUrl + iri;
  };
}

function isAbsoluteIri(iri: string): boolean {
  return (new IRI(iri).scheme()?.length ?? 0) > 0;
}

class DefaultSemanticClassBuilder implements SemanticClassBuilder {

  readonly model: DefaultSemanticModelBuilder;

  readonly identifier: string;

  readonly entity: SemanticModelClass;

  constructor(model: DefaultSemanticModelBuilder, entity: SemanticModelClass) {
    this.model = model;
    this.identifier = entity.id;
    this.entity = entity;
  }

  property(value: {
    iri?: string;
    name?: LanguageString;
    description?: LanguageString,
    range: Identifiable;
  }): SemanticRelationshipBuilder {
    return this.model.property({
      iri: value.iri,
      name: value.name,
      description: value.description,
    })
      .domain(this)
      .range(value.range);
  }

  build(): SemanticModelClass {
    return this.entity;
  }

}

class DefaultSemanticRelationshipBuilder
  implements SemanticRelationshipBuilder {

  readonly identifier: string;

  readonly entity: SemanticModelRelationship;

  readonly domainEnd: SemanticModelRelationshipEnd;

  readonly rangeEnd: SemanticModelRelationshipEnd;

  constructor(entity: SemanticModelRelationship) {
    this.identifier = entity.id;
    this.entity = entity;
    this.domainEnd = entity.ends[0];
    this.rangeEnd = entity.ends[1];
  }

  domain(value: Identifiable): SemanticRelationshipBuilder {
    this.domainEnd.concept = value.identifier;
    return this;
  }

  range(value: Identifiable): SemanticRelationshipBuilder {
    this.rangeEnd.concept = value.identifier;
    return this;
  }

  build(): SemanticModelRelationship {
    return this.entity;
  }

}

export function createDefaultSemanticModelBuilder(
  baseUrl: string,
): SemanticModelBuilder {
  return new DefaultSemanticModelBuilder(baseUrl);
}
