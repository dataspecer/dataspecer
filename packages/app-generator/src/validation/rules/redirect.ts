import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import { EdgeType } from '../../graph/types.ts';
import { isValidRedirectOperation } from './edge-rules.ts';
import type { StructuralValidationContext } from '../semantic-validation-context.ts';

export function validateRedirects(context: StructuralValidationContext): Violation[] {
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
    }
  });

  return violations;
}
