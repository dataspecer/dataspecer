import type { ApplicationGraph, ApplicationNode } from '../graph/types.ts';
import type { AggregateMetadata } from '../metadata/types.ts';

/**
 * Input of structural rules, the validation step that needs no Dataspecer metadata.
 */
export interface StructuralValidationContext {
  graph: ApplicationGraph;
  nodes: Map<string, ApplicationNode>;
}

export interface SemanticValidationContext extends StructuralValidationContext {
  /**
   * Aggregates keyed by IRI. The metadata must already be enriched with association kinds from
   * the graph config, otherwise the delete cascade and composition cycle rules report wrong
   * results.
   */
  aggregates: Map<string, AggregateMetadata>;
}
