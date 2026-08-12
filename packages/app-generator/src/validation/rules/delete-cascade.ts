import { semanticViolation, semanticWarning, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import { AssociationKind, DeletePolicy, Operation } from '../../graph/types.ts';
import { resolveAssociationChain } from '../association-chain.ts';
import { splitFieldPath } from '../field-path.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';

/**
 * Only associations resolved as compositions can be cascade-deleted.
 */
export function validateDeleteCascade(context: SemanticValidationContext): Violation[] {
  const violations: Violation[] = [];

  context.graph.nodes.forEach((node, nodeIndex) => {
    if (node.operation !== Operation.Delete) {
      return;
    }

    const deleteConfig = node.config?.delete;
    if (!deleteConfig) {
      return;
    }

    const aggregate = context.aggregates.get(node.aggregateIri);
    if (!aggregate) {
      return;
    }

    const cascadePaths = new Set(
      Object.entries(deleteConfig)
        .filter(([, policy]) => policy === DeletePolicy.Cascade)
        .map(([path]) => splitFieldPath(path).join('.'))
    );

    Object.entries(deleteConfig).forEach(([path, policy]) => {
      if (policy !== DeletePolicy.Cascade) {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticInvalidDeletePolicy,
            `Delete policy for "${path}" must be "cascade".`,
            `/nodes/${nodeIndex}/config/delete/${path}`
          )
        );
        return;
      }

      const chain = resolveAssociationChain(aggregate, path);
      if (!chain) {
        violations.push(
          semanticWarning(
            ViolationCode.SemanticDeletePathNotAssociation,
            `Delete cascade path "${path}" is not an association on aggregate "${aggregate.name}".`,
            `/nodes/${nodeIndex}/config/delete/${path}`
          )
        );
        return;
      }

      if (chain.at(-1)?.associationKind !== AssociationKind.Composition) {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticCannotCascadeAggregation,
            `Delete cascade path "${path}" is not a composition.`,
            `/nodes/${nodeIndex}/config/delete/${path}`
          )
        );
        return;
      }

      const segments = splitFieldPath(path);
      if (segments.length > 1 && !cascadePaths.has(segments.slice(0, -1).join('.'))) {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticCascadeRequiresParentCascade,
            `Delete cascade path "${path}" requires its parent composition "${segments
              .slice(0, -1)
              .join('.')}" to cascade as well.`,
            `/nodes/${nodeIndex}/config/delete/${path}`
          )
        );
      }
    });
  });

  return violations;
}
