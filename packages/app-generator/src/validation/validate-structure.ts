import type { ApplicationGraph } from '../graph/types.ts';
import type { StructuralValidationContext } from './semantic-validation-context.ts';
import type { Violation, ValidationResult } from './types.ts';
import { validateDatasource } from './rules/datasource.ts';
import { validateEdgeEndpoints } from './rules/edge-endpoint.ts';
import { validateNodeConfig } from './rules/node-config.ts';
import { validateRedirects } from './rules/redirect.ts';
import { validateRouteIds } from './rules/route-id.ts';
import { validateTransitions } from './rules/transition.ts';

/**
 * Runs the validation rules that need no Dataspecer metadata, so a graph can be checked quickly
 * and before metadata is available.
 */
export function validateGraphStructure(graph: ApplicationGraph): ValidationResult {
  const context: StructuralValidationContext = {
    graph,
    nodes: new Map(graph.nodes.map((node) => [node.id, node])),
  };

  const violations: Violation[] = [
    ...validateDatasource(context),
    ...validateNodeConfig(context),
    ...validateRouteIds(context),
    ...validateEdgeEndpoints(context),
    ...validateRedirects(context),
    ...validateTransitions(context),
  ];

  return {
    valid: violations.length === 0,
    violations,
  };
}
