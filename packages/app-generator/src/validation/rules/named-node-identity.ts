import { AssociationKind } from '../../graph/types.ts';
import { hasNestedModel } from '../../generation-model/field-shape.ts';
import { type AggregateFieldMetadata, FieldKind } from '../../metadata/types.ts';
import { joinFieldPath } from '../../utils/field-path.ts';
import { chainIdentity } from '../association-chain.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';
import { semanticWarning, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';

/**
 * Warns when a writable composition forbids the IRIs required by generated applications
 * (some IRI has to be provided when creating an instance, so it cannot be forbidden).
 */
export function validateNamedNodeIdentityOverrides(
  context: SemanticValidationContext
): Violation[] {
  const violations: Violation[] = [];
  const warned = new Set<string>();

  for (const aggregate of context.aggregates.values()) {
    visitFields(aggregate.classIri, aggregate.name, aggregate.fields, [], '', warned, violations);
  }

  return violations;
}

function visitFields(
  classIri: string,
  aggregateName: string,
  fields: AggregateFieldMetadata[],
  parentChain: AggregateFieldMetadata[],
  pathPrefix: string,
  warned: Set<string>,
  violations: Violation[]
): void {
  for (const field of fields) {
    if (field.kind !== FieldKind.Association) {
      continue;
    }

    const fieldPath = joinFieldPath(pathPrefix, field.path);
    const chain = [...parentChain, field];
    const warningKey = chainIdentity(classIri, chain);
    const neverSpecializations = field.specializations?.filter(
      (specialization) => specialization.identityPolicy === 'NEVER'
    );
    if (
      field.associationKind === AssociationKind.Composition &&
      (field.targetIdentityPolicy === 'NEVER' || neverSpecializations?.length) &&
      !warned.has(warningKey)
    ) {
      warned.add(warningKey);
      const affected = neverSpecializations?.length
        ? ` Affected specializations: ${neverSpecializations
            .map((specialization) => `"${specialization.label}"`)
            .join(', ')}.`
        : '';
      const message =
        `Composition "${fieldPath}" in "${aggregateName}" disallows child IRIs, ` +
        `but the app requires an IRI to edit each child and will use one.${affected} ` +
        'Set class instance identification to Optional or Required.';
      violations.push(
        semanticWarning(
          ViolationCode.SemanticNamedNodeIdentityOverride,
          message,
          '/dataSpecificationIri'
        )
      );
    }

    if (hasNestedModel(field)) {
      visitFields(classIri, aggregateName, field.fields, chain, fieldPath, warned, violations);
    }
  }
}
