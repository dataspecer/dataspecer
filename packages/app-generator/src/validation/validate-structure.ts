import type { ApplicationGraph } from '../graph/types.ts';
import type { StructuralValidationContext } from './semantic-validation-context.ts';
import type { Violation, ValidationResult } from './types.ts';
import { validateDatasource } from './rules/datasource.ts';
import { validateDuplicateEdges } from './rules/duplicate-edges.ts';
import { validateEdgeEndpoints } from './rules/edge-endpoint.ts';
import { validateNodeConfig } from './rules/node-config.ts';
import { validateRedirects } from './rules/redirect.ts';
import { validateRouteIds } from './rules/route-id.ts';
import { validateTransitions } from './rules/transition.ts';
import { hasErrors, semanticViolation } from './types.ts';
import { ViolationCode } from './violation-codes.ts';

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
    ...(graph.nodes.length === 0
      ? [
          semanticViolation(
            ViolationCode.SemanticNoNodes,
            'The application graph must contain at least one operation node.',
            '/nodes'
          ),
        ]
      : []),
    ...validateDatasource(context),
    ...validateNodeConfig(context),
    ...validateRouteIds(context),
    ...validateEdgeEndpoints(context),
    ...validateDuplicateEdges(context),
    ...validateRedirects(context),
    ...validateTransitions(context),
  ];

  return {
    valid: !hasErrors(violations),
    violations,
  };
}
