import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';
import { AssociationKind, DeletePolicy, Operation } from '../../graph/types.ts';
import { splitFieldPath } from '../field-path.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';
import {
  type AggregateFieldMetadata,
  type AggregateMetadata,
  FieldKind,
} from '../../metadata/types.ts';

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

      const field = findAssociationFieldByPath(path, aggregate);
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

/**
 * Delete cascade paths address association fields within the aggregate's own structure tree.
 * Nested segments descend into the inline fields of the parent association.
 */
function findAssociationFieldByPath(
  path: string,
  rootAggregate: AggregateMetadata
): AggregateFieldMetadata | undefined {
  let fields = rootAggregate.fields;
  let resolved: AggregateFieldMetadata | undefined;

  for (const segment of splitFieldPath(path)) {
    resolved = fields.find(
      (candidate) => candidate.path === segment && candidate.kind === FieldKind.Association
    );
    if (!resolved) {
      return undefined;
    }
    fields = resolved.fields ?? [];
  }

  return resolved;
}
