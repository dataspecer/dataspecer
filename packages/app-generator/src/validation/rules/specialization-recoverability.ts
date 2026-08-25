import { countBy } from 'es-toolkit';

import { AssociationKind } from '../../graph/types.ts';
import { hasNestedModel } from '../../metadata/field-shape.ts';
import {
  type AggregateFieldMetadata,
  type SpecializationMetadata,
  FieldKind,
} from '../../metadata/types.ts';
import { joinFieldPath } from '../../utils/field-path.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';
import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';

/**
 * Rejects same-class choices that stored RDF cannot distinguish after saving. For example, when reading an instance
 * with specialization, we don't have information on what specialization it has and have to derive it from its fields.
 * If the fields between specializations are not unique, it cannot be derived.
 */
export function validateSpecializationRecoverability(
  context: SemanticValidationContext
): Violation[] {
  const violations: Violation[] = [];
  for (const aggregate of context.aggregates.values()) {
    visitFields(aggregate.name, aggregate.fields, '', violations);
  }
  return violations;
}

function visitFields(
  aggregateName: string,
  fields: readonly AggregateFieldMetadata[],
  pathPrefix: string,
  violations: Violation[]
): void {
  for (const field of fields) {
    const fieldPath = joinFieldPath(pathPrefix, field.path);
    if (field.associationKind === AssociationKind.Composition && field.specializations?.length) {
      validateChoices(aggregateName, fieldPath, field, violations);
    }
    if (hasNestedModel(field)) {
      visitFields(aggregateName, field.fields, fieldPath, violations);
    }
  }
}

function validateChoices(
  aggregateName: string,
  fieldPath: string,
  field: AggregateFieldMetadata,
  violations: Violation[]
): void {
  const specializations = field.specializations ?? [];
  const memberships = fieldMemberships(specializations);
  const classCounts = countBy(specializations, (specialization) => specialization.classIri);

  for (const specialization of specializations) {
    if ((classCounts[specialization.classIri] ?? 0) < 2) {
      continue;
    }
    const recoverable = (field.fields ?? []).some((candidate) => {
      const members = memberships.get(candidate.path) ?? [];
      return (
        members.length === 1 &&
        members[0].specializationIri === specialization.specializationIri &&
        isEditable(candidate)
      );
    });
    if (!recoverable) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticUnrecoverableSpecialization,
          `Specialization "${specialization.label}" of composition "${fieldPath}" in ` +
            `"${aggregateName}" shares RDF class "${specialization.classIri}" with another ` +
            'choice but has no editable field unique to it. Add a branch-specific field or use ' +
            'a distinct RDF class.',
          '/dataSpecificationIri'
        )
      );
    }
  }
}

function fieldMemberships(
  specializations: readonly SpecializationMetadata[]
): ReadonlyMap<string, SpecializationMetadata[]> {
  const result = new Map<string, SpecializationMetadata[]>();
  for (const specialization of specializations) {
    for (const path of specialization.fieldPaths) {
      result.set(path, [...(result.get(path) ?? []), specialization]);
    }
  }
  return result;
}

function isEditable(field: AggregateFieldMetadata): boolean {
  return Boolean(
    field.propertyIri &&
    (field.kind === FieldKind.Primitive ||
      (field.kind === FieldKind.Association && field.targetClassIri))
  );
}
