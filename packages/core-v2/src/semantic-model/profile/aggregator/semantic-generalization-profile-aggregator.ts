import { EntityIdentifier } from "@dataspecer/core/entity-model";
import { SemanticModelGeneralizationProfile } from "../concepts/index.ts";
import {
  AggregatedProfileSemanticModelGeneralization,
} from "./aggregator-concepts.ts";

export const SemanticGeneralizationProfileAggregator = {
  /**
   * @returns List of all entities this entity depends on for aggregation.
   */
  dependencies: getDependencies,
  /**
   * @returns Aggregated entity.
   */
  aggregate: aggregateSemanticModelGeneralizationProfile,
};

function getDependencies(
  _entity: SemanticModelGeneralizationProfile,
): EntityIdentifier[] {
  // Generalization profile does not profile any other entity.
  return [];
}

function aggregateSemanticModelGeneralizationProfile(
  profile: SemanticModelGeneralizationProfile,
): AggregatedProfileSemanticModelGeneralization {
  // We just update type here as there is no change.
  return {
    ...profile,
    type: ["generalization", "aggregate"],
  };
}
