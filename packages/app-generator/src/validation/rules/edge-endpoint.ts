import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import type { StructuralValidationContext } from '../semantic-validation-context.ts';

export function validateEdgeEndpoints(context: StructuralValidationContext): Violation[] {
  return context.graph.edges.flatMap((edge, index) => {
    const violations: Violation[] = [];
    if (!context.nodes.has(edge.source)) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticUnknownEdgeSource,
          `Edge "${edge.id}" references unknown source node "${edge.source}".`,
          `/edges/${index}/source`
        )
      );
    }

    if (!context.nodes.has(edge.target)) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticUnknownEdgeTarget,
          `Edge "${edge.id}" references unknown target node "${edge.target}".`,
          `/edges/${index}/target`
        )
      );
    }

    return violations;
  });
}
