import type { SemanticModelAggregator } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ProfileOperation } from "../profile-model.ts";
import {
  applyOperationsToCopy,
  deriveEvolutionItems,
  type EvolutionAnalysis,
} from "./evolution-items.ts";

export interface ProfileEvolutionInput {
  /**
   * All models needed to aggregate the upstream application profile: the
   * profile model itself and every model it (transitively) builds on.
   */
  models: Record<string, EntityRecord>;
  /** Key in {@link models} of the profile model the operations target. */
  upstreamModelId: string;
  /** Pending operations on the upstream profile model. */
  operations: ProfileOperation[];
  /** Entities of the dependent (child) profile model. */
  profileEntities: EntityRecord;
  /**
   * Builds an aggregator over the given models whose aggregated entities
   * represent the upstream profile with inherited values resolved. Typically
   * `build` from `@dataspecer/specification/model-hierarchy` (this package
   * cannot depend on it directly, the dependency would be circular).
   */
  buildAggregator: (models: Record<string, EntityRecord>) => SemanticModelAggregator;
}

/**
 * Reacts to changes in an application profile model: analyzes a whole batch of
 * pending operations at once and derives a decision structure for a dependent
 * (child) profile model that profiles it.
 *
 * A profile entity inherits values from the entities it profiles, so its raw
 * fields do not tell what the dependent model actually sees. The upstream
 * profile is therefore aggregated through its whole model hierarchy — before
 * and after the operations — and the two aggregated states are diffed. This
 * catches indirect effects too (an operation on one upstream entity changing
 * the effective values of another that profiles it) and suppresses no-ops (an
 * override that equals the value inherited so far).
 *
 * The projection of the diff onto the dependent model is shared with
 * {@link analyzeEvolution}; see {@link deriveEvolutionItems} for the item
 * semantics.
 */
export function analyzeProfileEvolution(input: ProfileEvolutionInput): EvolutionAnalysis {
  const { models, upstreamModelId, operations, profileEntities, buildAggregator } = input;

  const upstreamBefore = models[upstreamModelId] ?? {};
  const aggregatedBefore = getAggregatedRecord(buildAggregator(models));

  const upstreamAfter = applyOperationsToCopy(upstreamBefore, operations);
  const aggregatedAfter = getAggregatedRecord(
    buildAggregator({ ...models, [upstreamModelId]: upstreamAfter }));

  return {
    upstreamBefore: aggregatedBefore,
    upstreamAfter: aggregatedAfter,
    items: deriveEvolutionItems(aggregatedBefore, aggregatedAfter, profileEntities),
  };
}

function getAggregatedRecord(aggregator: SemanticModelAggregator): EntityRecord {
  const result: EntityRecord = {};
  for (const wrapped of Object.values(aggregator.getAggregatedEntities())) {
    result[wrapped.aggregatedEntity.id] = wrapped.aggregatedEntity;
  }
  return result;
}
