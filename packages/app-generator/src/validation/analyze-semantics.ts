import type { Violation, ValidationResult } from './types.ts';
import type { ApplicationGraph } from '../graph/types.ts';
import type { SpecificationMetadata } from '../metadata/types.ts';
import { validateAggregateReferences } from './rules/aggregate-reference.ts';
import { enrichMetadata } from './enrich-metadata.ts';
import { validateCompositionCycles } from './rules/composition-cycle.ts';
import { validateDatasource } from './rules/datasource.ts';
import { validateDeleteCascade } from './rules/delete-cascade.ts';
import { validateEdgeEndpoints } from './rules/edge-endpoint.ts';
import { validateNodeConfig } from './rules/node-config.ts';
import { validateRedirects } from './rules/redirect.ts';
import { validateTransitions } from './rules/transition.ts';

export interface SemanticAnalysisResult extends ValidationResult {
  enrichedMetadata: SpecificationMetadata;
}

export function analyzeGraphSemantics(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata
): SemanticAnalysisResult {
  const enrichment = enrichMetadata(graph, metadata);
  const aggregates = new Map(
    enrichment.metadata.aggregates.map((aggregate) => [aggregate.iri, aggregate])
  );
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const violations: Violation[] = [...enrichment.violations];

  const context = {
    graph,
    aggregates,
    nodes,
  };

  violations.push(...validateDatasource(context));
  violations.push(...validateAggregateReferences(context));
  violations.push(...validateNodeConfig(context));
  violations.push(...validateEdgeEndpoints(context));
  violations.push(...validateRedirects(context));
  violations.push(...validateTransitions(context));
  violations.push(...validateDeleteCascade(context));
  violations.push(...validateCompositionCycles(context));

  return {
    valid: violations.length === 0,
    violations,
    enrichedMetadata: enrichment.metadata,
  };
}
