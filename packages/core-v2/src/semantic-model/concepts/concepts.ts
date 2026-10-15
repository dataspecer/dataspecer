import { Entity } from "../../entity-model/entity.ts";
import { LOCAL_SEMANTIC_MODEL } from "../../model/known-models.ts";
import { SEMANTIC_MODEL_APPLICATION_PROFILE_SUBTYPE } from "../profile/concepts/profile.ts";
import { SEMANTIC_MODEL_CLASS, SEMANTIC_MODEL_GENERALIZATION, SEMANTIC_MODEL_RELATIONSHIP } from "./concepts-utils.ts";
import { OrderedThing } from "./ordered-thing.ts";

/**
 * A human text that is translated into multiple languages.
 *
 * Keys are ISO 639-1 language codes.
 */
export type LanguageString = { [key: string]: string };

export interface SemanticModelEntity extends Entity {
  /**
   * Public, usually globally-recognised, identifier of the entity.
   * The value may be null indicating that the entity has no public IRI.
   * @example http://xmlns.com/foaf/0.1/Person
   *
   * IRI may be relative to the base IRI of the model.
   */
  iri: string | null;
}

/**
 * This is the main entity that each semantic model should have. It carries the
 * metadata about the model itself and other instructions how to interpret the
 * model.
 */
export interface MainSemanticModelEntity extends Entity {
  type: [typeof LOCAL_SEMANTIC_MODEL];

  /**
   * This is used to distinguish between different types of semantic models.
   *
   * Since this is a new property, for backward compatibility, some models may
   * not have this property set.
   *
   * Currently we support
   *   {@link SEMANTIC_MODEL_APPLICATION_PROFILE_SUBTYPE}
   */
  subType?: string;

  label: LanguageString;

  /**
   * Base IRI used for resolving relative IRIs used in this model.
   * @todo We want to deprecate this property as it brings complexity to the model.
   */
  baseIri?: string | null;

  /**
   * For models that are used as a cache for remote models.
   * @todo This property is historical artifact and should be refactored.
   */
  caches?: string[];
}

/**
 * Represents something that can be named and described.
 *
 * Because there are multiple ways how to represent name and description, we
 * have `*Property` to denote which RDF property is used for the name and
 * description. This is friendly for the users of the model, but it cannot
 * support advanced cases where, for example, both rdfs:label and skos:prefLabel
 * are used together. We should switch to more general model where entity can
 * have any metadata properties.
 */
export interface NamedThing {
  name: LanguageString;
  description: LanguageString;

  /**
   * RDF property that is used for the {@link name} of the entity.
   * Typical values are rdfs:label or skos:prefLabel (but in their IRI form).
   *
   * If not set, then the value is unknown.
   */
  nameProperty?: string | null;

  /**
   * RDF property that is used for the {@link description}.
   * Typical values are rdfs:comment or skos:definition (but in their IRI form).
   *
   * If not set, then the value is unknown.
   */
  descriptionProperty?: string | null;
}

/**
 * Represent classes, enumerations and simple data types.
 */
export interface SemanticModelClass extends NamedThing, SemanticModelEntity, OrderedThing {
  type: [typeof SEMANTIC_MODEL_CLASS];

  // todo: is it class, enumeration, datatype, code list, ...

  /**
   * URL of external documentation.
   *
   * The URL can be absolute or relative.
   *
   * This value is optional as it can be missing in the source data.
   * You should not set the value to undefined manually.
   * Use null to indicate an absence of a value.
   */
  externalDocumentationUrl?: string | null;
}

/**
 * Represents attributes and associations.
 */
export interface SemanticModelRelationship extends NamedThing, SemanticModelEntity {
  type: [typeof SEMANTIC_MODEL_RELATIONSHIP];

  ends: SemanticModelRelationshipEnd[];

  // todo: is it attribute or association
}

export interface SemanticModelRelationshipEnd extends NamedThing, OrderedThing {
  iri: string | null;
  cardinality?: [number, number | null];

  /** {@link SemanticModelClass} */
  concept: string | null;

  /**
   * URL of external documentation.
   *
   * The URL can be absolute or relative.
   *
   * This value is optional as it can be missing in the source data.
   * You should not set the value to undefined manually.
   * Use null to indicate an absence of a value.
   */
  externalDocumentationUrl?: string | null;
}

/**
 * Inheritance hierarchy.
 */
export interface SemanticModelGeneralization extends SemanticModelEntity {
  type: [typeof SEMANTIC_MODEL_GENERALIZATION];

  /** {@link SemanticModelClass} */
  child: string;

  /** {@link SemanticModelClass} */
  parent: string;
}
