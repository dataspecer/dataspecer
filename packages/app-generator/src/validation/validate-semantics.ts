import type { Violation, ValidationResult } from './types.ts';
import type { ApplicationGraph } from '../graph/types.ts';
import type { DataspecerMetadataProvider } from '../metadata/dataspecer-metadata-provider.ts';
import { validateAggregateReferences } from './aggregate-reference-validation.ts';
import { validateDatasource } from './datasource-validation.ts';
import { validateDeleteCascade } from './delete-cascade-validation.ts';
import { validateEdgeEndpoints } from './edge-endpoint-validation.ts';
import { validateRedirects } from './redirect-validation.ts';
import { validateTransitions } from './transition-validation.ts';

export async function validateGraphSemantics(
  graph: ApplicationGraph,
  metadataProvider: DataspecerMetadataProvider
): Promise<ValidationResult> {
  const metadata = await metadataProvider.getSpecificationMetadata(graph.dataSpecificationIri);
  const aggregates = new Map(metadata.aggregates.map((aggregate) => [aggregate.iri, aggregate]));
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const violations: Violation[] = [];

  const context = {
    graph,
    aggregates,
    nodes,
  };

  violations.push(...validateDatasource(context));
  violations.push(...validateAggregateReferences(context));
  violations.push(...validateEdgeEndpoints(context));
  violations.push(...validateRedirects(context));
  violations.push(...validateTransitions(context));
  violations.push(...validateDeleteCascade(context));

  return {
    valid: violations.length === 0,
    violations: violations,
  };
}
