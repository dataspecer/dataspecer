import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { SemanticOperation } from "@dataspecer/semantic-model";
import {
  deriveEvolutionItems,
  type EvolutionAnalysis,
} from "./evolution-items.ts";

/**
 * Reacts to changes in a semantic model (vocabulary): analyzes a whole batch
 * of pending operations at once and derives a decision structure for a
 * dependent profile model.
 *
 * Instead of reacting operation by operation, the operations are applied to a
 * copy of the upstream model and the resulting entity-level net diff is
 * projected onto the profile model: multiple operations touching one entity
 * collapse into a single item, and created relationships/generalizations can
 * reference class profiles that are themselves only proposed to be created
 * (via provisional ids and `dependsOn`).
 *
 * The upstream operations are assumed to be applied wholesale; the returned
 * items only describe how the profile model can react. All operations embedded
 * in the items are materialized against the state before the evolution, so
 * they stay valid regardless of when (and in which subset) they are committed.
 */
export function analyzeEvolution(
  upstreamBefore: EntityRecord,
  operations: SemanticOperation[],
  profileEntities: EntityRecord,
): EvolutionAnalysis {
  const upstreamAfter = { ...upstreamBefore };
  applyOperationsToSemanticModel(upstreamAfter, operations);
  return {
    upstreamBefore,
    upstreamAfter,
    items: deriveEvolutionItems(upstreamBefore, upstreamAfter, profileEntities),
  };
}
