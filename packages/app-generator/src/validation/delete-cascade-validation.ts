import type { Violation } from './types.ts';
import { ViolationCode } from './violation-codes.ts';
import { Operation } from '../graph/types.ts';
import { getObjectConfig } from './config.ts';
import { semanticViolation } from './violation.ts';
import type { SemanticValidationContext } from './semantic-validation-context.ts';
import { AssociationKind, FieldKind } from '../metadata/types.ts';

export function validateDeleteCascade(context: SemanticValidationContext): Violation[] {
  const violations: Violation[] = [];

  context.graph.nodes.forEach((node, nodeIndex) => {
    if (node.operation !== Operation.Delete) {
      return;
    }

    const deleteConfig = getObjectConfig(node.config, 'delete');
    if (!deleteConfig) {
      return;
    }

    const aggregate = context.aggregates.get(node.aggregateIri);
    if (!aggregate) {
      return;
    }

    Object.entries(deleteConfig).forEach(([path, policy]) => {
      if (policy !== 'cascade') {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticInvalidDeletePolicy,
            `Delete policy for "${path}" must be "cascade".`,
            `/nodes/${nodeIndex}/config/delete/${path}`
          )
        );
        return;
      }

      const field = aggregate.fields.find((candidate) => candidate.path === path);
      if (!field || field.kind !== FieldKind.Association) {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticDeletePathNotAssociation,
            `Delete cascade path "${path}" is not an association on aggregate "${aggregate.name}".`,
            `/nodes/${nodeIndex}/config/delete/${path}`
          )
        );
        return;
      }

      if (field.associationKind !== AssociationKind.Composition) {
        violations.push(
          semanticViolation(
            ViolationCode.SemanticCannotCascadeAggregation,
            `Delete cascade path "${path}" is not a composition.`,
            `/nodes/${nodeIndex}/config/delete/${path}`
          )
        );
      }
    });
  });

  return violations;
}
