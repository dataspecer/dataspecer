import { hasErrors, type Violation, type ValidationResult } from './types.ts';
import type { ApplicationGraph } from '../graph/types.ts';
import type { SpecificationMetadata } from '../metadata/types.ts';
import { collectReachableAggregateIris } from '../generation-model/aggregate-reachability.ts';
import { enrichMetadata } from './enrich-metadata.ts';
import { validateGraphStructure } from './validate-structure.ts';
import { validateAggregateNames } from './rules/aggregate-names.ts';
import { validateAggregateReferences } from './rules/aggregate-reference.ts';
import { validateCompositionCycles } from './rules/composition-cycle.ts';
import { validateDeleteCascade } from './rules/delete-cascade.ts';
import { validateRedirectClasses } from './rules/redirect-classes.ts';
import { validateTransitionClasses } from './rules/transition-classes.ts';
import { validateGeneratedFieldNames } from './rules/generated-field-names.ts';
import { validateNamedNodeIdentityOverrides } from './rules/named-node-identity.ts';
import { coalesceRdfPropertyAliases } from './coalesce-rdf-property-aliases.ts';
import { validateSpecializationRecoverability } from './rules/specialization-recoverability.ts';
import { normalizeValueConstraints } from './normalize-value-constraints.ts';

export interface SemanticAnalysisResult extends ValidationResult {
  enrichedMetadata: SpecificationMetadata;
}

/**
 * Validates the graph and enriches the metadata in one pass. Structural rules run as part of the
 * analysis, so a valid result means the graph passed every rule except syntax.
 */
export function analyzeGraphSemantics(
  graph: ApplicationGraph,
  metadata: SpecificationMetadata,
): SemanticAnalysisResult {
  const structure = validateGraphStructure(graph);
  const enrichment = enrichMetadata(graph, metadata);
  // validate only aggregates that rendering emits, unused structures must not block generation
  const reachableAggregateIris = collectReachableAggregateIris(
    graph.nodes.map((node) => node.aggregateIri),
    enrichment.metadata.aggregates,
  );
  const constraints = normalizeValueConstraints(enrichment.metadata, reachableAggregateIris);
  const aliases = coalesceRdfPropertyAliases(graph, constraints.metadata, reachableAggregateIris);
  const context = {
    graph,
    aggregates: new Map(
      aliases.metadata.aggregates
        .filter((aggregate) => reachableAggregateIris.has(aggregate.iri))
        .map((aggregate) => [aggregate.iri, aggregate]),
    ),
    nodes: new Map(graph.nodes.map((node) => [node.id, node])),
  };

  const violations: Violation[] = [
    ...structure.violations,
    ...enrichment.violations,
    ...constraints.violations,
    ...aliases.violations,
  ];
  violations.push(...validateAggregateNames(context));
  violations.push(...validateGeneratedFieldNames(context));
  violations.push(...validateSpecializationRecoverability(context));
  violations.push(...validateNamedNodeIdentityOverrides(context));
  violations.push(...validateAggregateReferences(context));
  violations.push(...validateRedirectClasses(context));
  violations.push(...validateTransitionClasses(context));
  violations.push(...validateDeleteCascade(context));
  violations.push(...validateCompositionCycles(context));

  return {
    valid: !hasErrors(violations),
    violations,
    enrichedMetadata: aliases.metadata,
  };
}
