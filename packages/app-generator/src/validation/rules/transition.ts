import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import { EdgeType } from '../../graph/types.ts';
import { isValidTransitionOperation } from './edge-rules.ts';
import type { StructuralValidationContext } from '../semantic-validation-context.ts';

export function validateTransitions(context: StructuralValidationContext): Violation[] {
  return context.graph.edges.flatMap((edge, index) => {
    if (edge.type !== EdgeType.Transition) {
      return [];
    }

    const sourceNode = context.nodes.get(edge.source);
    const targetNode = context.nodes.get(edge.target);
    if (!sourceNode || !targetNode) {
      return [];
    }

    if (!isValidTransitionOperation(sourceNode.operation, targetNode.operation)) {
      return [
        semanticViolation(
          ViolationCode.SemanticInvalidTransition,
          `Transition "${edge.id}" from ${sourceNode.operation} to ${targetNode.operation} is not valid.`,
          `/edges/${index}`
        ),
      ];
    }

    return [];
  });
}
