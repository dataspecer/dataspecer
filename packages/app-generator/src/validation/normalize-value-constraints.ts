import { uniq } from 'es-toolkit';

import type {
  AggregateFieldMetadata,
  AggregateMetadata,
  SpecificationMetadata,
} from '../metadata/types.ts';
import { hasNestedModel } from '../metadata/field-shape.ts';
import { joinFieldPath } from '../utils/field-path.ts';
import { semanticWarning, type Violation } from './types.ts';
import { ViolationCode } from './violation-codes.ts';

interface ValueConstraintNormalizationResult {
  metadata: SpecificationMetadata;
  violations: Violation[];
}

/** Removes regex patterns that the generated application cannot compile. */
export function normalizeValueConstraints(
  metadata: SpecificationMetadata,
  aggregateIris: ReadonlySet<string>,
): ValueConstraintNormalizationResult {
  const violations: Violation[] = [];
  const aggregates = metadata.aggregates.map((aggregate) =>
    aggregateIris.has(aggregate.iri)
      ? { ...aggregate, fields: normalizeFields(aggregate, aggregate.fields, '', violations) }
      : aggregate,
  );
  return { metadata: { ...metadata, aggregates }, violations };
}

function normalizeFields(
  aggregate: AggregateMetadata,
  fields: AggregateFieldMetadata[],
  pathPrefix: string,
  violations: Violation[],
): AggregateFieldMetadata[] {
  return fields.map((field) => {
    const fieldPath = joinFieldPath(pathPrefix, field.path);
    const patterns = uniq(field.patterns ?? []).filter((pattern) => {
      try {
        new RegExp(pattern);
        return true;
      } catch {
        violations.push(
          semanticWarning(
            ViolationCode.SemanticInvalidRegexPattern,
            `Regex "${pattern}" on field "${fieldPath}" in aggregate "${aggregate.name}" ` +
              'is invalid in JavaScript and is not enforced. Correct it in Dataspecer.',
            '/dataSpecificationIri',
          ),
        );
        return false;
      }
    });
    const examples = uniq(field.examples ?? []);
    const children = hasNestedModel(field)
      ? normalizeFields(aggregate, field.fields, fieldPath, violations)
      : undefined;
    const { patterns: _patterns, examples: _examples, ...unchanged } = field;
    return {
      ...unchanged,
      ...(patterns.length ? { patterns } : {}),
      ...(examples.length ? { examples } : {}),
      ...(children ? { fields: children } : {}),
    };
  });
}
