import {
  fieldValues,
  isEntityRecord,
  type AggregateDescriptorMap,
  type FieldDescriptor,
  type FormControl,
} from '../types/aggregate.ts';
import { ValidationIssueCode, type ValidationIssue } from '../operations/operation-result.ts';
import {
  isCompositionField,
  maximumCount,
  minimumCount,
  resolveCompositionTarget,
  type EntityTarget,
} from './entity-target.ts';
import { isSafeAbsoluteIri } from './iri.ts';

export type FieldControl = FormControl | 'reference' | 'composition' | 'unsupported';

export function resolveControl(field: FieldDescriptor): FieldControl {
  if (field.kind === 'association') {
    if (isCompositionField(field)) {
      return 'composition';
    }
    // Aggregations remain references even when their structure exposes fields for display.
    return field.targetClassIri ? 'reference' : 'unsupported';
  }
  return field.formControl ?? 'unsupported';
}

// Converts a control's raw input into the value the model and LDKit expect. Empty text clears the
// value so an unset optional field is not written.
export function coerceValue(control: FieldControl, raw: string, checked: boolean): unknown {
  switch (control) {
    case 'integer':
    case 'number':
      return raw === '' ? undefined : Number(raw);
    case 'date':
    case 'datetime':
      return raw === '' ? undefined : new Date(raw);
    case 'checkbox':
      return checked;
    default:
      return raw;
  }
}

// Formats a model value for display in the control's input element.
export function toInputValue(control: FieldControl, value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    if (control === 'datetime') {
      // datetime-local displays wall-clock time, while toISOString uses UTC.
      const localTime = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
      return localTime.toISOString().slice(0, 16);
    }
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return '';
}

// Checks identifiers, exact cardinality, duplicate repeated values, and composed entities
// recursively. Fields without an editable control are excluded.
export function validateModel(
  model: Record<string, unknown>,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  validateEntity(model, target, aggregateRegistry, '', issues);
  return issues;
}

function validateEntity(
  model: Record<string, unknown>,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  pathPrefix: string,
  issues: ValidationIssue[]
): void {
  const idPath = joinPath(pathPrefix, 'id');
  if (typeof model.id !== 'string' || model.id.trim() === '') {
    issues.push({
      code: ValidationIssueCode.Required,
      message: 'Identifier (IRI) is required.',
      path: idPath,
    });
  } else if (!isSafeAbsoluteIri(model.id)) {
    issues.push({
      code: ValidationIssueCode.InvalidIri,
      message: 'Identifier must be a valid absolute IRI.',
      path: idPath,
    });
  }

  for (const field of target.fields) {
    if (resolveControl(field) === 'unsupported') {
      continue;
    }
    const fieldPath = joinPath(pathPrefix, field.path);
    const value = model[field.propertyName];
    const values = fieldValues(value, field);
    const presentValues = values.filter((entry) => !isEmptyValue(entry));
    const minCount = minimumCount(field);
    const maxCount = maximumCount(field);

    if (presentValues.length < minCount) {
      issues.push({
        code: ValidationIssueCode.MinCount,
        message:
          minCount === 1
            ? `${field.label} is required.`
            : `${field.label} requires at least ${minCount} values.`,
        path: fieldPath,
      });
    }
    if (maxCount !== null && presentValues.length > maxCount) {
      issues.push({
        code: ValidationIssueCode.MaxCount,
        message: `${field.label} allows at most ${maxCount} values.`,
        path: fieldPath,
      });
    }

    if (field.many && presentValues.length > 1 && hasDuplicateValues(presentValues)) {
      issues.push({
        code: ValidationIssueCode.Duplicate,
        message: `${field.label} contains duplicate values.`,
        path: fieldPath,
      });
    }

    if (
      resolveControl(field) === 'reference' &&
      presentValues.some((entry) => {
        const id = referenceId(entry);
        return id === null || !isSafeAbsoluteIri(id);
      })
    ) {
      issues.push({
        code: ValidationIssueCode.InvalidIri,
        message: `${field.label} must contain ${field.many ? 'valid absolute IRIs' : 'a valid absolute IRI'}.`,
        path: fieldPath,
      });
    }

    if (!isCompositionField(field)) {
      continue;
    }

    const childTarget = resolveCompositionTarget(target, field, aggregateRegistry);
    if (!childTarget) {
      issues.push({
        code: ValidationIssueCode.MissingCompositionTarget,
        message: `Composition target for ${field.label} is unavailable.`,
        path: fieldPath,
      });
      continue;
    }

    presentValues.forEach((entry, index) => {
      if (!isEntityRecord(entry)) {
        issues.push({
          code: ValidationIssueCode.InvalidComposition,
          message: `${field.label} must contain an entity.`,
          path: field.many ? `${fieldPath}[${index}]` : fieldPath,
        });
        return;
      }
      validateEntity(
        entry,
        childTarget,
        aggregateRegistry,
        field.many ? `${fieldPath}[${index}]` : fieldPath,
        issues
      );
    });
  }
}

function referenceId(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (isEntityRecord(value) && typeof value.id === 'string') {
    return value.id;
  }
  return null;
}

function hasDuplicateValues(values: unknown[]): boolean {
  const identities = values.map(valueIdentity).filter((value) => value !== null);
  return new Set(identities).size !== identities.length;
}

function valueIdentity(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : `date:${value.toISOString()}`;
  }
  if (value !== null && typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' && id !== '' ? `id:${id}` : null;
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return `${typeof value}:${String(value)}`;
  }
  return null;
}

function joinPath(prefix: string, segment: string): string {
  return prefix ? `${prefix}.${segment}` : segment;
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.filter((entry) => !isEmptyValue(entry)).length === 0;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime());
  }
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    if ('id' in value) {
      return typeof id !== 'string' || id.trim() === '';
    }
  }
  return false;
}
