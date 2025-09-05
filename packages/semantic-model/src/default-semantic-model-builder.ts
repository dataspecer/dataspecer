import { createIriResolver } from "@dataspecer/utilities";

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
import { createInMemorySemanticModel } from "./in-memory/index.ts";
import {
  IdentifiableBuilder,
  SemanticClassBuilder,
  SemanticGeneralizationBuilder,
  SemanticModelBuilder,
  SemanticModelProperty,
  SemanticRelationshipBuilder,
} from "./semantic-model-builder.ts";

type LanguageString = { [language: string]: string };

type Resolver = (iri: string) => string;

class DefaultSemanticModelBuilder implements SemanticModelBuilder {

  counter: number = 0;

  readonly identifier: string;

  readonly baseIri: string;

  readonly urlResolver: Resolver;

  /**
   * Unlike {@link urlResolver} this one always produce absolute URL.
   */
  readonly absoluteUrlResolver: Resolver;

  readonly identifierResolver: Resolver;

  readonly entities: Record<string, SemanticEntity>;

  constructor(
    identifier: string,
    baseIri: string,
    urlResolver: Resolver,
    identifierResolver: Resolver,
  ) {
    this.identifier = identifier;
    this.baseIri = baseIri;
    this.urlResolver = urlResolver;
    this.absoluteUrlResolver = createIriResolver(baseIri);
    this.identifierResolver = identifierResolver
    this.entities = {};
  }

  class(value?: Partial<SemanticModelClass>): SemanticClassBuilder {
    const identifier = value?.id ?? this.nextIdentifier();
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
    return this.identifierResolver(String(this.counter).padStart(3, "0"));
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

  build(): SemanticModel {
    return createInMemorySemanticModel({
      identifier: this.identifier,
      baseIri: this.baseIri,
      entities: this.entities,
    });
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

  absoluteIri(): string {
    return this.model.absoluteUrlResolver(this.entity.iri ?? this.identifier);
  }

  property(value: {
    iri?: string;
    name?: LanguageString;
    description?: LanguageString,
    range: IdentifiableBuilder;
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

  domain(value: IdentifiableBuilder): SemanticRelationshipBuilder {
    this.domainEnd.concept = value.identifier;
    return this;
  }

  range(value: IdentifiableBuilder): SemanticRelationshipBuilder {
    this.rangeEnd.concept = value.identifier;
    return this;
  }

  build(): SemanticModelRelationship {
    return this.entity;
  }

}

export function createDefaultSemanticModelBuilder(configuration: {
  baseIdentifier: string,
  baseIri: string,
  /**
   * When true the relative URL of entities are resolved.
   */
  resolveUrl?: boolean,
}): SemanticModelBuilder {
  const urlResolver: Resolver = configuration.resolveUrl === true ?
    createIriResolver(configuration.baseIri) : iri => iri;
  return new DefaultSemanticModelBuilder(
    configuration.baseIdentifier, configuration.baseIri,
    urlResolver,
    (identifier) => configuration.baseIdentifier + identifier,
  );
}
