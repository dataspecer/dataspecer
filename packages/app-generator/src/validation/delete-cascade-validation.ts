import type { Violation } from './types.ts';
import { ViolationCode } from './violation-codes.ts';
import { DeletePolicy, Operation } from '../graph/types.ts';
import { semanticViolation } from './violation.ts';
import type { SemanticValidationContext } from './semantic-validation-context.ts';
import {
  AssociationKind,
  type AggregateFieldMetadata,
  type AggregateMetadata,
  FieldKind,
} from '../metadata/types.ts';

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

      const field = findAssociationFieldByPath(path, aggregate, context.aggregates);
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

function findAssociationFieldByPath(
  path: string,
  rootAggregate: AggregateMetadata,
  aggregates: SemanticValidationContext['aggregates']
): AggregateFieldMetadata | undefined {
  let aggregate = rootAggregate;

  const segments = path.split('.').filter((candidate) => candidate.length > 0);
  for (const [index, segment] of segments.entries()) {
    const field = aggregate.fields.find((candidate) => candidate.path === segment);
    if (!field || field.kind !== FieldKind.Association) {
      return undefined;
    }

    if (index === segments.length - 1) {
      return field;
    }

    if (!field.targetAggregateIri) {
      return undefined;
    }

    const targetAggregate = aggregates.get(field.targetAggregateIri);
    if (!targetAggregate) {
      return undefined;
    }
    aggregate = targetAggregate;
  }

  return undefined;
}
