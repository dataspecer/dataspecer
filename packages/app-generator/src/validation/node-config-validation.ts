import type { Violation } from './types.ts';
import { ViolationCode } from './violation-codes.ts';
import { Operation } from '../graph/types.ts';
import type { SemanticValidationContext } from './semantic-validation-context.ts';
import { semanticViolation } from './violation.ts';

/**
 * Association kinds may be configured on Create, Update, and Delete nodes. Delete nodes need
 * them to describe cascade targets. Delete policies may be configured only on Delete nodes.
 */
const OPERATIONS_WITH_ASSOCIATION_CONFIG = new Set([
  Operation.Create,
  Operation.Update,
  Operation.Delete,
]);

export function validateNodeConfig(context: SemanticValidationContext): Violation[] {
  return context.graph.nodes.flatMap((node, index) => {
    const violations: Violation[] = [];

    if (node.config?.associations && !OPERATIONS_WITH_ASSOCIATION_CONFIG.has(node.operation)) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticAssociationConfigNotAllowed,
          `Node "${node.id}" with operation ${node.operation} cannot configure association kinds.`,
          `/nodes/${index}/config/associations`
        )
      );
    }

    if (node.config?.delete && node.operation !== Operation.Delete) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticDeleteConfigNotAllowed,
          `Node "${node.id}" with operation ${node.operation} cannot configure delete policies.`,
          `/nodes/${index}/config/delete`
        )
      );
    }

    return violations;
  });
}
