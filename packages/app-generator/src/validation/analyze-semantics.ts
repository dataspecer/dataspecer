import type { Violation, ValidationResult } from './types.ts';
import type { ApplicationGraph } from '../graph/types.ts';
import type { DataspecerSpecificationMetadata } from '../metadata/types.ts';
import { validateAggregateReferences } from './aggregate-reference-validation.ts';
import { enrichMetadata } from './enrich-metadata.ts';
import { validateCompositionCycles } from './composition-cycle-validation.ts';
import { validateDatasource } from './datasource-validation.ts';
import { validateDeleteCascade } from './delete-cascade-validation.ts';
import { validateEdgeEndpoints } from './edge-endpoint-validation.ts';
import { validateNodeConfig } from './node-config-validation.ts';
import { validateRedirects } from './redirect-validation.ts';
import { validateTransitions } from './transition-validation.ts';

export interface SemanticAnalysisResult extends ValidationResult {
  enrichedMetadata: DataspecerSpecificationMetadata;
}

export function analyzeGraphSemantics(
  graph: ApplicationGraph,
  metadata: DataspecerSpecificationMetadata
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
