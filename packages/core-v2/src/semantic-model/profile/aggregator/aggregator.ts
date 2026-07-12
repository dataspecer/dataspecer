import { Entity, EntityIdentifier } from "../../../entity-model/entity.ts";
import {
  SemanticModelClass,
  SemanticModelRelationship,
} from "../../concepts/index.ts";
import {
  isSemanticModelClassProfile,
  isSemanticModelGeneralizationProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelGeneralizationProfile,
  SemanticModelRelationshipProfile,
} from "../concepts/index.ts";
import {
  AggregatedProfiledSemanticModelClass,
  AggregatedProfiledSemanticModelRelationship,
  AggregatedProfileSemanticModelGeneralization,
} from "./aggregator-concepts.ts";
import {
  SemanticClassProfileAggregator,
} from "./semantic-class-profile-aggregator.ts";
import {
  SemanticRelationshipProfileAggregator,
} from "./semantic-relationship-profile-aggregator.ts";
import {
  SemanticGeneralizationProfileAggregator,
} from "./semantic-generalization-profile-aggregator.ts";

/**
 * Provide single interface for access to semantic profile aggregator.
 */
export function createSemanticProfileAggregator(): SemanticProfileAggregator {
  return new DefaultProfileEntityAggregator();
}

export interface SemanticProfileAggregator {

  /**
   * Given an entity analyze and return dependencies to other entities.
   * @returns Null it the entity is not known to the analyzer.
   */
  dependencies(entity: Entity): EntityIdentifier[] | null;

  aggregateSemanticModelClassProfile(
    profile: SemanticModelClassProfile,
    dependencies: (
      SemanticModelClass |
      SemanticModelClassProfile |
      AggregatedProfiledSemanticModelClass
    )[],
  ): AggregatedProfiledSemanticModelClass;

  aggregateSemanticModelRelationshipProfile(
    profile: SemanticModelRelationshipProfile,
    dependencies: (
      SemanticModelRelationship |
      SemanticModelRelationshipProfile |
      AggregatedProfiledSemanticModelRelationship
    )[],
  ): AggregatedProfiledSemanticModelRelationship;

  aggregateSemanticModelGeneralizationProfile(
    profile: SemanticModelGeneralizationProfile,
  ): AggregatedProfileSemanticModelGeneralization;

}

/**
 * Just a wrapper to expose internal functionality of this package.
 */
class DefaultProfileEntityAggregator implements SemanticProfileAggregator {

  dependencies(entity: Entity): EntityIdentifier[] | null {
    if (isSemanticModelClassProfile(entity)) {
      return SemanticClassProfileAggregator.dependencies(entity);
    }
    if (isSemanticModelRelationshipProfile(entity)) {
      return SemanticRelationshipProfileAggregator.dependencies(entity);
    }
    if (isSemanticModelGeneralizationProfile(entity)) {
      return SemanticGeneralizationProfileAggregator.dependencies(entity);
    }
    return null;
  }

  aggregateSemanticModelClassProfile(
    profile: SemanticModelClassProfile,
    aggregatedProfiled: (
      SemanticModelClass |
      SemanticModelClassProfile |
      AggregatedProfiledSemanticModelClass
    )[],
  ): AggregatedProfiledSemanticModelClass {
    return SemanticClassProfileAggregator
      .aggregate(profile, aggregatedProfiled);
  }

  aggregateSemanticModelRelationshipProfile(
    profile: SemanticModelRelationshipProfile,
    aggregatedProfiled: (
      SemanticModelRelationship |
      SemanticModelRelationshipProfile |
      AggregatedProfiledSemanticModelRelationship
    )[],
  ): AggregatedProfiledSemanticModelRelationship {
    return SemanticRelationshipProfileAggregator
      .aggregate(profile, aggregatedProfiled);
  }

  aggregateSemanticModelGeneralizationProfile(
    profile: SemanticModelGeneralizationProfile,
  ): AggregatedProfileSemanticModelGeneralization {
    return SemanticGeneralizationProfileAggregator.aggregate(profile);
  }

}
