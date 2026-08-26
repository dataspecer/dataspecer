import { semanticWarning, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import { Operation } from '../../graph/types.ts';
import type { StructuralValidationContext } from '../semantic-validation-context.ts';

/**
 * Association kinds may be configured only on Create and Update nodes. Delete cascade paths are
 * validated against those declarations, so Delete nodes carry no association config themselves.
 * Delete policies may be configured only on Delete nodes.
 */
const OPERATIONS_WITH_ASSOCIATION_CONFIG = new Set([Operation.Create, Operation.Update]);

export function validateNodeConfig(context: StructuralValidationContext): Violation[] {
  return context.graph.nodes.flatMap((node, index) => {
    const violations: Violation[] = [];

    if (node.config?.associations && !OPERATIONS_WITH_ASSOCIATION_CONFIG.has(node.operation)) {
      violations.push(
        semanticWarning(
          ViolationCode.SemanticAssociationConfigNotAllowed,
          `Node "${node.id}" uses ${node.operation}, but association settings apply only to ` +
            'Create and Update nodes. This setting is ignored. Remove it or configure a write node.',
          `/nodes/${index}/config/associations`,
        ),
      );
    }

    if (node.config?.delete && node.operation !== Operation.Delete) {
      violations.push(
        semanticWarning(
          ViolationCode.SemanticDeleteConfigNotAllowed,
          `Node "${node.id}" uses ${node.operation}, but delete settings apply only to Delete ` +
            'nodes. This setting is ignored. Remove it or configure a Delete node.',
          `/nodes/${index}/config/delete`,
        ),
      );
    }

    return violations;
  });
}
