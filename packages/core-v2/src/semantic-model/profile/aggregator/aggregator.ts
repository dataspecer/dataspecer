import { Entity, EntityIdentifier } from "../../../entity-model/entity.ts";
import {
  SemanticModelClass,
  SemanticModelRelationship,
} from "../../concepts/index.ts";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "../concepts/index.ts";
import {
  AggregatedProfiledSemanticModelClass,
  AggregatedProfiledSemanticModelRelationship,
} from "./aggregator-model.ts";
import {
  SemanticClassProfileAggregator,
} from "./semantic-class-profile-aggregator.ts";
import {
  SemanticRelationshipProfileAggregator,
} from "./semantic-relationship-profile-aggregator.ts";

/**
 * Provide single interface for access to semantic profile aggregator.
 */
export function createSemanticProfileAggregator(): ProfileEntityAggregator {
  return new DefaultProfileEntityAggregator();
}

export interface ProfileEntityAggregator extends ProfileAggregator {

  /**
   * Given an entity analyze and return dependencies to other entities.
   * @returns Null it the entity is not known to the analyzer.
   */
  dependencies(entity: Entity): EntityIdentifier[] | null;

}

export interface ProfileAggregator {

  aggregateSemanticModelClassProfile(
    profile: SemanticModelClassProfile,
    aggregatedProfiled: (
      SemanticModelClassProfile |
      SemanticModelClass |
      AggregatedProfiledSemanticModelClass
    )[],
  ): AggregatedProfiledSemanticModelClass;

  aggregateSemanticModelRelationshipProfile(
    profile: SemanticModelRelationshipProfile,
    aggregatedProfiled: (
      SemanticModelRelationshipProfile |
      SemanticModelRelationship |
      AggregatedProfiledSemanticModelRelationship
    )[],
  ): AggregatedProfiledSemanticModelRelationship;

}

class DefaultProfileEntityAggregator implements ProfileEntityAggregator {

  dependencies(entity: Entity): EntityIdentifier[] | null {
    if (isSemanticModelClassProfile(entity)) {
      return SemanticClassProfileAggregator.dependencies(entity);
    }
    if (isSemanticModelRelationshipProfile(entity)) {
      return SemanticRelationshipProfileAggregator.dependencies(entity);
    }
    return null;
  }

  aggregateSemanticModelClassProfile(
    profile: SemanticModelClassProfile,
    aggregatedProfiled: (
      SemanticModelClassProfile |
      SemanticModelClass |
      AggregatedProfiledSemanticModelClass
    )[],
  ): AggregatedProfiledSemanticModelClass {
    return SemanticClassProfileAggregator
      .aggregate(profile, aggregatedProfiled);
  }

  aggregateSemanticModelRelationshipProfile(
    profile: SemanticModelRelationshipProfile,
    aggregatedProfiled: (
      SemanticModelRelationshipProfile |
      SemanticModelRelationship |
      AggregatedProfiledSemanticModelRelationship
    )[],
  ): AggregatedProfiledSemanticModelRelationship {
    return SemanticRelationshipProfileAggregator
      .aggregate(profile, aggregatedProfiled);
  }

}
