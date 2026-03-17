import type { ApplicationGraph, ApplicationNode } from '../graph/types.ts';
import type { AggregateMetadata } from '../metadata/types.ts';

export interface SemanticValidationContext {
  graph: ApplicationGraph;
  aggregates: Map<string, AggregateMetadata>;
  nodes: Map<string, ApplicationNode>;
}
