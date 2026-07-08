import type { Violation, ValidationResult } from './types.ts';
import type { ApplicationGraph } from '../graph/types.ts';
import type { SpecificationMetadata } from '../metadata/types.ts';
import { enrichMetadata } from './enrich-metadata.ts';
import { validateGraphStructure } from './validate-structure.ts';
import { validateAggregateNames } from './rules/aggregate-names.ts';
import { validateAggregateReferences } from './rules/aggregate-reference.ts';
import { validateCompositionCycles } from './rules/composition-cycle.ts';
import { validateDeleteCascade } from './rules/delete-cascade.ts';
import { validateRedirectClasses } from './rules/redirect-classes.ts';
import { validateTransitionClasses } from './rules/transition-classes.ts';

export interface SemanticAnalysisResult extends ValidationResult {
  enrichedMetadata: SpecificationMetadata;
}

/**
 * Validates the graph and enriches the metadata in one pass. Structural rules run as part of the
 * analysis, so a valid result means the graph passed every rule except syntax.
 */
export function analyzeGraphSemantics(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata
): SemanticAnalysisResult {
  const structure = validateGraphStructure(graph);
  const enrichment = enrichMetadata(graph, metadata);
  const context = {
    graph,
    aggregates: new Map(
      enrichment.metadata.aggregates.map((aggregate) => [aggregate.iri, aggregate])
    ),
    nodes: new Map(graph.nodes.map((node) => [node.id, node])),
  };

  const violations: Violation[] = [...structure.violations, ...enrichment.violations];
  violations.push(...validateAggregateNames(context));
  violations.push(...validateAggregateReferences(context));
  violations.push(...validateRedirectClasses(context));
  violations.push(...validateTransitionClasses(context));
  violations.push(...validateDeleteCascade(context));
  violations.push(...validateCompositionCycles(context));

  return {
    valid: violations.length === 0,
    violations,
    enrichedMetadata: enrichment.metadata,
  };
}
