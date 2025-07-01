import { Entity } from "@dataspecer/core-v2";
import {
  SEMANTIC_MODEL_CLASS,
  SemanticModelClass,
  SemanticModelGeneralization,
  SemanticModelRelationship,
  SemanticModel,
  SEMANTIC_MODEL_RELATIONSHIP,
  SemanticModelRelationshipEnd,
} from "./semantic-model.ts";
import { createReadOnlyInMemoryEntityModel } from "@dataspecer/entity-model";
import { createReadOnlyInMemorySemanticModel } from "./semantic-model-factory.ts";

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

  build(): SemanticModel;

}

export interface SemanticClassBuilder extends Identifiable {

  /**
   * Create a relation with this class as the domain.
   */
  property(value: {
    iri?: string,
    name?: LanguageString,
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

  externalDocumentationUrl: string | null;

}

export interface SemanticGeneralizationBuilder extends Identifiable {

  generalization<Type extends SemanticClassBuilder | SemanticRelationshipBuilder>(
    parent: Type, child: Type,
  ): SemanticRelationshipBuilder;

  build(): SemanticModelGeneralization;

}

class DefaultSemanticModelBuilder implements SemanticModelBuilder {

  counter: number = 0;

  readonly baseUrl: string;

  readonly entities: Record<string, Entity>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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
      iri: this.baseUrl + (value?.iri ?? `class#${this.counter}`),
    };
    this.entities[identifier] = entity;
    return new DefaultSemanticClassBuilder(this, entity);
  }

  nextIdentifier() {
    ++this.counter;
    return this.baseUrl + "000-" + String(this.counter).padStart(3, "0");
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
        iri: this.baseUrl + (value?.iri ?? `relationship#${this.counter}`),
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

  build(): SemanticModel {
    return createReadOnlyInMemorySemanticModel(
      this.baseUrl,
      createReadOnlyInMemoryEntityModel(this.baseUrl, this.entities),
    );
  }

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
    range: Identifiable;
  }): SemanticRelationshipBuilder {
    return this.model.property({
      iri: value.iri,
      name: value.name,
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
