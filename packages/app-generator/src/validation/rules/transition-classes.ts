import { semanticViolation, semanticWarning, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import { EdgeType, Operation } from '../../graph/types.ts';
import { hasAssociationToTarget, haveSameClass } from './aggregate-rules.ts';
import {
  isValidTransitionOperation,
  requiresSameClassOrAssociationTransition,
  requiresSameClassTransition,
} from './edge-rules.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';

export function validateTransitionClasses(context: SemanticValidationContext): Violation[] {
  return context.graph.edges.flatMap((edge, index) => {
    if (edge.type !== EdgeType.Transition) {
      return [];
    }

    const sourceNode = context.nodes.get(edge.source);
    const targetNode = context.nodes.get(edge.target);
    if (!sourceNode || !targetNode) {
      return [];
    }

    // Invalid operation pairs are already reported by the transition structure rule.
    if (!isValidTransitionOperation(sourceNode.operation, targetNode.operation)) {
      return [];
    }

    if (
      requiresSameClassTransition(sourceNode.operation, targetNode.operation) &&
      !haveSameClass(sourceNode, targetNode, context.aggregates)
    ) {
      return [
        semanticViolation(
          ViolationCode.SemanticTransitionRequiresSameClass,
          `Transition "${edge.id}" connects operations over different RDF classes. ` +
            'Use operations representing the same class or remove the edge.',
          `/edges/${index}`,
        ),
      ];
    }

    if (
      requiresSameClassOrAssociationTransition(sourceNode.operation, targetNode.operation) &&
      !haveSameClass(sourceNode, targetNode, context.aggregates) &&
      !hasAssociationToTarget(
        sourceNode,
        targetNode,
        context.aggregates,
        sourceNode.operation === Operation.ReadDetail,
      )
    ) {
      return [
        semanticWarning(
          ViolationCode.SemanticTransitionRequiresAssociation,
          `Transition "${edge.id}" cannot generate navigation because its aggregates use ` +
            'different RDF classes and the source has no association to the target. ' +
            'Use matching aggregates or add an association.',
          `/edges/${index}`,
        ),
      ];
    }

    return [];
  });
}
