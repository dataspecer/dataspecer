import { toRouteId } from '../../utils/naming.ts';
import type { ApplicationNode } from '../../graph/types.ts';
import type { StructuralValidationContext } from '../semantic-validation-context.ts';
import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';

/**
 * Node ids are unique, but distinct ids can still produce the same route id after diacritics
 * stripping and kebab casing.
 */
export function validateRouteIds(context: StructuralValidationContext): Violation[] {
  const violations: Violation[] = [];
  const firstNodeByRouteId = new Map<string, ApplicationNode>();

  context.graph.nodes.forEach((node, index) => {
    const routeId = toRouteId(node.id);
    const first = firstNodeByRouteId.get(routeId);
    if (!first) {
      firstNodeByRouteId.set(routeId, node);
      return;
    }

    violations.push(
      semanticViolation(
        ViolationCode.SemanticDuplicateRouteId,
        `Nodes "${first.id}" and "${node.id}" both produce route "${routeId}".`,
        `/nodes/${index}/id`
      )
    );
  });

  return violations;
}
