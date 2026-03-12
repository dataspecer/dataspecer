import { Entity } from "../../../entity-model/index.ts";
import { NamedThingProfile } from "./named-thing-profile.ts";
import { Profile } from "./profile.ts";

/**
 * For now we do not extend {@link NamedThingProfile} here.
 * We store data using the end with the "iri" set.
 * As a result the relationship entity is basically blank.
 */
export interface SemanticModelRelationshipProfile extends Entity {

  type: [typeof SEMANTIC_MODEL_RELATIONSHIP_PROFILE];

  ends: SemanticModelRelationshipEndProfile[];

}

export const SEMANTIC_MODEL_RELATIONSHIP_PROFILE = "relationship-profile";

export function isSemanticModelRelationshipProfile(entity: Entity | null): entity is SemanticModelRelationshipProfile {
  return entity?.type.includes(SEMANTIC_MODEL_RELATIONSHIP_PROFILE) ?? false;
}

export interface SemanticModelRelationshipEndProfile extends NamedThingProfile, Profile {

  /**
   * Public, usually globally-recognized, identifier of the entity.
   * The value may be null indicating that the entity has no public IRI.
   * @example http://xmlns.com/foaf/0.1/Person
   *
   * IRI may be relative to the base IRI of the model.
   */
  iri: string | null;

  /**
   * Must be descendant or self of the corresponding concept of the used entity.
   * At the same time it must be set, we do not allow null here.
   */
  concept: string;

  /**
   * Must be stricter or equal to the corresponding cardinality of the profiled entity.
   * When null the cardinality is profiled from all profiles.
   * The value should be determined as an intersection.
   */
  cardinality: [number, number | null] | null;

  /**
   * Collections of IRIs tagging this resources.
   */
  tags: string[];

  /**
   * Optional ordering string for custom sorting of profiles.
   * Uses natural sort order, items without order are placed at the end.
   */
  order?: string | null;

}
