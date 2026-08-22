import type { AggregateFieldMetadata, AggregateMetadata } from '../../metadata/types.ts';
import { toAggregateTypeName, toNestedModelTypeName, toPropertyName } from '../../utils/naming.ts';
import type { SemanticValidationContext } from '../semantic-validation-context.ts';
import { semanticViolation, type Violation } from '../types.ts';
import { ViolationCode } from '../violation-codes.ts';

const reservedPropertyNames = new Set(['id', '__specializationIri', '__rdfTypes']);

/**
 * Metadata paths become TypeScript property and nested model names. Collisions must be rejected
 * before rendering because object keys and LDKit schema entries would otherwise overwrite each
 * other silently.
 */
export function validateGeneratedFieldNames(context: SemanticValidationContext): Violation[] {
  const violations: Violation[] = [];

  for (const aggregate of context.aggregates.values()) {
    const nestedModelPaths = new Map<string, string>();
    validateFields(aggregate, aggregate.fields, '', nestedModelPaths, violations);
  }

  return violations;
}

function validateFields(
  aggregate: AggregateMetadata,
  fields: AggregateFieldMetadata[],
  pathPrefix: string,
  nestedModelPaths: Map<string, string>,
  violations: Violation[]
): void {
  const firstPathByPropertyName = new Map<string, string>();

  for (const field of fields) {
    const fieldPath = pathPrefix ? `${pathPrefix}.${field.path}` : field.path;
    const propertyName = toPropertyName(field.path);
    if (reservedPropertyNames.has(propertyName)) {
      violations.push(
        semanticViolation(
          ViolationCode.SemanticDuplicateGeneratedFieldName,
          `Field "${fieldPath}" in aggregate "${aggregate.name}" produces reserved property name "${propertyName}". Rename the field in Dataspecer.`,
          '/dataSpecificationIri'
        )
      );
    }
    const firstPath = firstPathByPropertyName.get(propertyName);
    if (firstPath !== undefined) {
      violations.push(
        collisionViolation(aggregate, firstPath, fieldPath, `property name "${propertyName}"`)
      );
    } else {
      firstPathByPropertyName.set(propertyName, fieldPath);
    }

    if (field.fields?.length && field.targetClassIri) {
      const nestedModelName = toNestedModelTypeName(toAggregateTypeName(aggregate.name), fieldPath);
      const firstNestedPath = nestedModelPaths.get(nestedModelName);
      if (firstNestedPath !== undefined) {
        violations.push(
          collisionViolation(
            aggregate,
            firstNestedPath,
            fieldPath,
            `nested model name "${nestedModelName}"`
          )
        );
      } else {
        nestedModelPaths.set(nestedModelName, fieldPath);
      }
    }

    if (field.fields) {
      validateFields(aggregate, field.fields, fieldPath, nestedModelPaths, violations);
    }
  }
}

function collisionViolation(
  aggregate: AggregateMetadata,
  firstPath: string,
  secondPath: string,
  generatedName: string
): Violation {
  return semanticViolation(
    ViolationCode.SemanticDuplicateGeneratedFieldName,
    `Fields "${firstPath}" and "${secondPath}" in aggregate "${aggregate.name}" both produce ${generatedName}. Rename one of the fields in Dataspecer.`,
    '/dataSpecificationIri'
  );
}
