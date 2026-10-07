import type { SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship, SemanticModelRelationshipEnd } from "./concepts/index.ts";

// This file contains simple initializers intended to be used for
// deserialization. This covers cases when new properties are added to the
// interface that are not present in the serialized data. If you want to do data
// migration, such as transforming a property value, you should use more
// advanced migration functions instead.

export function initializeSemanticModelClass(entity: SemanticModelClass): SemanticModelClass {
  return {
    id: "",
    type: ["class"],
    iri: null,
    name: {},
    description: {},
    nameProperty: null,
    descriptionProperty: null,
    order: null,
    externalDocumentationUrl: null,

    ...(entity as Partial<SemanticModelClass>),
  } satisfies { [Key in keyof SemanticModelClass]-?: SemanticModelClass[Key] };
}

export function initializeSemanticModelRelationshipEnd(end: SemanticModelRelationshipEnd): SemanticModelRelationshipEnd {
  return {
    iri: null,
    name: {},
    description: {},
    nameProperty: null,
    descriptionProperty: null,
    order: null,
    cardinality: [0, null],
    concept: null,
    externalDocumentationUrl: null,

    ...(end as Partial<SemanticModelRelationshipEnd>),
  } satisfies { [Key in keyof SemanticModelRelationshipEnd]-?: SemanticModelRelationshipEnd[Key] };
}

export function initializeSemanticModelRelationship(entity: SemanticModelRelationship): SemanticModelRelationship {
  return {
    id: "",
    type: ["relationship"],
    iri: null,
    name: {},
    description: {},
    nameProperty: null,
    descriptionProperty: null,

    ...(entity as Partial<SemanticModelRelationship>),
    ends: entity.ends ?
      entity.ends.map(end => initializeSemanticModelRelationshipEnd(end)) :
      [
        initializeSemanticModelRelationshipEnd({} as SemanticModelRelationshipEnd),
        initializeSemanticModelRelationshipEnd({} as SemanticModelRelationshipEnd),
      ],
  } satisfies { [Key in keyof SemanticModelRelationship]-?: SemanticModelRelationship[Key] };
}

export function initializeSemanticModelGeneralization(entity: SemanticModelGeneralization): SemanticModelGeneralization {
  return {
    id: "",
    type: ["generalization"],
    iri: null,
    child: "",
    parent: "",

    ...(entity as Partial<SemanticModelGeneralization>),
  } satisfies { [Key in keyof SemanticModelGeneralization]-?: SemanticModelGeneralization[Key] };
}
