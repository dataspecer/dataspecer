import { Entity } from "@dataspecer/core/entity-model";
import { EntityIdentifier } from "../../../entity-model/entity.ts";
import {
  SEMANTIC_MODEL_CLASS_PROFILE,
  SemanticModelClassProfile,
} from "../concepts/class-profile.ts";
import {
  SEMANTIC_MODEL_RELATIONSHIP_PROFILE,
  SemanticModelRelationshipEndProfile,
  SemanticModelRelationshipProfile,
} from "../concepts/relationship-profile.ts";
import {
  SEMANTIC_GENERALIZATION_PROFILE,
  SemanticModelGeneralizationProfile,
} from "../concepts/index.ts";
import { NamedThingProfile } from "../concepts/named-thing-profile.ts";

/**
 * Return true when given entity is an aggregate entity.
 */
export function isAggregatedProfiledSemanticModelEntity(
  entity: Entity | null,
): boolean {
  if (entity === null) {
    return false;
  }
  return entity.type.includes(AGGREGATE);
}

/**
 * Represent type of aggregated entity.
 */
export const AGGREGATE = "aggregate";

/**
 * Compatible with {@link SemanticModelClassProfile}.
 */
export interface AggregatedProfiledSemanticModelClass
  extends Omit<SemanticModelClassProfile, "type" | "order">,
  AggregatedNamedThingProfile, AggregatedOrderedEntity {

  type: [typeof SEMANTIC_MODEL_CLASS_PROFILE, typeof AGGREGATE];

  /**
   * List of IRIs of the original classes that were referenced by the profile.
   */
  conceptIris: string[];

  /**
   * List of identifiers of the non-profile (root) entities that were
   * referenced by the profile.
   */
  conceptIdentifiers: EntityIdentifier[];

}

export function isAggregatedProfiledSemanticModelClass(
  entity: Entity | null,
): entity is AggregatedProfiledSemanticModelClass {
  if (entity === null) {
    return false;
  }
  return entity.type.includes(SEMANTIC_MODEL_CLASS_PROFILE)
    && entity.type.includes(AGGREGATE);
}

interface AggregatedNamedThingProfile {
  /**
   * This is computed value based on the nameProperty of the profiled entity
   * from which the name is inherited.
   */
  nameFromProperty: string | null;

  /**
   * IRI of an RDF property to hold name. For vocabulary entities, this might be
   * non-null, for profiled entities, this is always null since we do not
   * support "changing" these properties.
   */
  nameProperty: string | null;

  /**
   * This is computed value based on the descriptionProperty of the profiled entity
   * from which the description is inherited.
   */
  descriptionFromProperty: string | null;

  /**
   * IRI of an RDF property to hold description. For vocabulary entities, this
   * might be non-null, for profiled entities, this is always null since we do
   * not support "changing" these properties.
   */
  descriptionProperty: string | null;

}

interface AggregatedOrderedEntity {

  /**
   * Uses natural sort order, items without order are placed at the end.
   */
  order: string | null;

}

/**
 * Compatible with {@link SemanticModelRelationshipProfile}.
 */
export interface AggregatedProfiledSemanticModelRelationship
  extends Omit<SemanticModelRelationshipProfile, "type"> {

  type: [typeof SEMANTIC_MODEL_RELATIONSHIP_PROFILE, typeof AGGREGATE];

  ends: AggregatedProfiledSemanticModelRelationshipEnd[];

}

export function isAggregatedProfiledSemanticModelRelationship(
  entity: Entity | null,
): entity is AggregatedProfiledSemanticModelRelationship {
  if (entity === null) {
    return false;
  }
  return entity.type.includes(SEMANTIC_MODEL_RELATIONSHIP_PROFILE)
    && entity.type.includes(AGGREGATE);
}

export interface AggregatedProfiledSemanticModelRelationshipEnd
  extends Omit<SemanticModelRelationshipEndProfile, "order">,
  AggregatedNamedThingProfile, AggregatedOrderedEntity {

  /**
   * List of IRIs of the original ends that were referenced by the profile.
   */
  conceptIris: string[];

  /**
   * List of identifiers of the non-profile (root) entities that were
   * referenced by the profile.
   */
  conceptIdentifiers: EntityIdentifier[];

}

/**
 * Compatible with {@link SemanticModelGeneralizationProfile}.
 */
export interface AggregatedProfileSemanticModelGeneralization
  extends Omit<SemanticModelGeneralizationProfile, "type"> {

  type: [typeof SEMANTIC_GENERALIZATION_PROFILE, typeof AGGREGATE];

}

export function isAggregatedProfileSemanticModelGeneralization(
  entity: Entity | null,
): entity is AggregatedProfileSemanticModelGeneralization {
  if (entity === null) {
    return false;
  }
  return entity.type.includes(SEMANTIC_GENERALIZATION_PROFILE)
    && entity.type.includes(AGGREGATE);
}
