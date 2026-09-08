import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import { EdgeType, Operation } from '../../graph/types.ts';
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
          `Transition "${edge.id}" cannot connect ${sourceNode.operation} to ` +
            `${targetNode.operation}. ${invalidTransitionHint(sourceNode.operation)}`,
          `/edges/${index}`,
        ),
      ];
    }

    return [];
  });
}

function invalidTransitionHint(source: Operation): string {
  switch (source) {
    case Operation.ReadList:
      return 'A transition from ReadList must target Create, ReadDetail, Update, or Delete.';
    case Operation.ReadDetail:
      return 'Create can only be a transition target from ReadList.';
    case Operation.Create:
      return 'Create cannot start a transition. Use a redirect from Create to ReadList or ReadDetail.';
    case Operation.Update:
      return 'Update cannot start a transition. Use a redirect from Update to ReadList or ReadDetails.';
    case Operation.Delete:
      return 'Delete cannot start a transition. Use a redirect from Delete to ReadList';
    default:
      return 'This operation cannot start a transition.';
  }
}
