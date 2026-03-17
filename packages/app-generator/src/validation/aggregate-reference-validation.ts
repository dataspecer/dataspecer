import type { Violation } from './types.ts';
import { ViolationCode } from './violation-codes.ts';
import type { SemanticValidationContext } from './semantic-validation-context.ts';
import { semanticViolation } from './violation.ts';

export function validateAggregateReferences(context: SemanticValidationContext): Violation[] {
  return context.graph.nodes.flatMap((node, index) => {
    if (context.aggregates.has(node.aggregateIri)) {
      return [];
    }

    return [
      semanticViolation(
        ViolationCode.SemanticUnknownAggregate,
        `Node "${node.id}" references unknown aggregate "${node.aggregateIri}".`,
        `/nodes/${index}/aggregateIri`
      ),
    ];
  });
}
