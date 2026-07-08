import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import { EdgeType } from '../../graph/types.ts';
import { hasAssociationToTarget, haveSameClass } from './aggregate-rules.ts';
import {
  isValidTransitionOperation,
  requiresSameClassOrAssociationTransition,
  requiresSameClassTransition,
} from './edge-rules.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';

export function validateTransitions(context: SemanticValidationContext): Violation[] {
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

    if (
      requiresSameClassTransition(sourceNode.operation, targetNode.operation) &&
      !haveSameClass(sourceNode, targetNode, context.aggregates)
    ) {
      return [
        semanticViolation(
          ViolationCode.SemanticTransitionRequiresSameClass,
          `Transition "${edge.id}" requires source and target aggregates to represent the same class.`,
          `/edges/${index}`
        ),
      ];
    }

    if (
      requiresSameClassOrAssociationTransition(sourceNode.operation, targetNode.operation) &&
      !haveSameClass(sourceNode, targetNode, context.aggregates) &&
      !hasAssociationToTarget(sourceNode, targetNode, context.aggregates)
    ) {
      return [
        semanticViolation(
          ViolationCode.SemanticTransitionRequiresAssociation,
          `Transition "${edge.id}" requires same-class aggregates or an association from source to target.`,
          `/edges/${index}`
        ),
      ];
    }

    return [];
  });
}
