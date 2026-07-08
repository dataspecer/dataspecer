import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import { EdgeType, Operation } from '../../graph/types.ts';
import { haveSameClass } from './aggregate-rules.ts';
import { isValidRedirectOperation } from './edge-rules.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';

export function validateRedirects(context: SemanticValidationContext): Violation[] {
  const violations: Violation[] = [];
  const redirectSources = new Set<string>();

  context.graph.edges.forEach((edge, index) => {
    if (edge.type !== EdgeType.Redirect) {
      return;
    }

    if (redirectSources.has(edge.source)) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticMultipleRedirects,
          `Node "${edge.source}" has more than one redirect.`,
          `/edges/${index}/source`
        )
      );
    }
    redirectSources.add(edge.source);

    const sourceNode = context.nodes.get(edge.source);
    const targetNode = context.nodes.get(edge.target);
    if (!sourceNode || !targetNode) {
      return;
    }

    if (!isValidRedirectOperation(sourceNode.operation, targetNode.operation)) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticInvalidRedirect,
          `Redirect "${edge.id}" from ${sourceNode.operation} to ${targetNode.operation} is not valid.`,
          `/edges/${index}`
        )
      );
      return;
    }

    if (
      targetNode.operation === Operation.ReadDetail &&
      !haveSameClass(sourceNode, targetNode, context.aggregates)
    ) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticRedirectRequiresSameClass,
          `Redirect "${edge.id}" to ReadDetail requires source and target aggregates to represent the same class.`,
          `/edges/${index}`
        )
      );
    }
  });

  return violations;
}
