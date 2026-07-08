import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import { EdgeType, Operation } from '../../graph/types.ts';
import { haveSameClass } from './aggregate-rules.ts';
import { isValidRedirectOperation } from './edge-rules.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';

export function validateRedirectClasses(context: SemanticValidationContext): Violation[] {
  return context.graph.edges.flatMap((edge, index) => {
    if (edge.type !== EdgeType.Redirect) {
      return [];
    }

    const sourceNode = context.nodes.get(edge.source);
    const targetNode = context.nodes.get(edge.target);
    if (!sourceNode || !targetNode) {
      return [];
    }

    // Invalid operation pairs are already reported by the redirect structure rule.
    if (!isValidRedirectOperation(sourceNode.operation, targetNode.operation)) {
      return [];
    }

    if (
      targetNode.operation === Operation.ReadDetail &&
      !haveSameClass(sourceNode, targetNode, context.aggregates)
    ) {
      return [
        semanticViolation(
          ViolationCode.SemanticRedirectRequiresSameClass,
          `Redirect "${edge.id}" to ReadDetail requires source and target aggregates to represent the same class.`,
          `/edges/${index}`
        ),
      ];
    }

    return [];
  });
}
