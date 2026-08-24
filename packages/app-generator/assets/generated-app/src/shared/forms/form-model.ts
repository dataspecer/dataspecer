import {
  fieldValues,
  isEntityRecord,
  isEmptyValue,
  RDF_TYPES_PROPERTY,
  SPECIALIZATION_IRI_PROPERTY,
  type AggregateDescriptorMap,
  type EntityRecord,
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
import { joinValidationPath } from './field-path.ts';
import { isSafeAbsoluteIri } from './iri.ts';
import {
  hasDuplicateMultilingualValues,
  isMultilingualField,
  multilingualLanguagesOverLimit,
  nonEmptyMultilingualValues,
} from './multilingual-value.ts';
import {
  effectiveFields,
  hasSelectedBranchEvidence,
  resolveSpecialization,
  selectedSpecialization,
} from './specialization.ts';

export type FieldControl = FormControl | 'reference' | 'composition' | 'unsupported';

export function resolveControl(field: FieldDescriptor): FieldControl {
  if (field.kind === 'association') {
    if (isCompositionField(field)) {
      return 'composition';
    }
    // aggregations stay references even when their structure exposes display fields
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
      // datetime-local displays wall-clock time, while toISOString uses UTC
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

// Checks identifiers, cardinality, duplicate and patterned values, and composed entities
// recursively, fields without an editable control are excluded
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
  const idPath = joinValidationPath(pathPrefix, 'id');
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

  if (!validateSpecialization(model, target, pathPrefix, issues)) {
    return;
  }

  for (const field of effectiveFields(target, model)) {
    const control = resolveControl(field);
    if (control === 'unsupported') {
      continue;
    }
    const fieldPath = joinValidationPath(pathPrefix, field.path);
    const value = model[field.propertyName];
    if (isMultilingualField(field)) {
      validateMultilingualField(field, value, fieldPath, issues);
      continue;
    }
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

    if (values.some((entry) => entry instanceof Date && Number.isNaN(entry.getTime()))) {
      issues.push({
        code: ValidationIssueCode.InvalidValue,
        message: `${field.label} is not a complete date.`,
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

    const referenceIds = control === 'reference' ? presentValues.map(referenceId) : [];
    const hasInvalidReference = referenceIds.some((id) => id === null || !isSafeAbsoluteIri(id));
    if (hasInvalidReference) {
      issues.push({
        code: ValidationIssueCode.InvalidIri,
        message: `${field.label} must contain ${field.many ? 'valid absolute IRIs' : 'a valid absolute IRI'}.`,
        path: fieldPath,
      });
    }

    const constrainedValues =
      control === 'reference'
        ? referenceIds.filter((id): id is string => id !== null)
        : presentValues.filter((entry): entry is string => typeof entry === 'string');
    if (!hasInvalidReference && hasPatternMismatch(field, constrainedValues)) {
      issues.push(patternMismatchIssue(field, fieldPath));
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

function validateSpecialization(
  model: Record<string, unknown>,
  target: EntityTarget,
  pathPrefix: string,
  issues: ValidationIssue[]
): boolean {
  if (!target.specializations?.length) {
    return true;
  }
  const entity = model as EntityRecord;
  const selected = selectedSpecialization(target, entity);
  const path = joinValidationPath(pathPrefix, SPECIALIZATION_IRI_PROPERTY);
  if (!selected) {
    if (Object.hasOwn(entity, RDF_TYPES_PROPERTY)) {
      const resolution = resolveSpecialization(target, entity);
      issues.push({
        code: ValidationIssueCode.SpecializationUnresolved,
        message:
          resolution.kind === 'conflicting'
            ? `${target.name} contains conflicting evidence for multiple specializations and cannot be saved.`
            : `${target.name} does not contain enough evidence to identify one specialization and cannot be saved.`,
        path,
      });
    } else {
      issues.push({
        code: ValidationIssueCode.SpecializationRequired,
        message: `Select a specialization for ${target.name}.`,
        path,
      });
    }
    return false;
  }

  if (!hasSelectedBranchEvidence(target, entity, selected)) {
    issues.push({
      code: ValidationIssueCode.SpecializationEvidenceRequired,
      message:
        `Enter a value in at least one field unique to "${selected.label}". ` +
        'Otherwise the specialization cannot be identified after saving.',
      path,
    });
    return false;
  }
  return true;
}

function validateMultilingualField(
  field: FieldDescriptor,
  value: unknown,
  fieldPath: string,
  issues: ValidationIssue[]
): void {
  const presentValues = nonEmptyMultilingualValues(value);
  if (minimumCount(field) > 0 && presentValues.length === 0) {
    issues.push({
      code: ValidationIssueCode.MinCount,
      message: `${field.label} is required in at least one language.`,
      path: fieldPath,
    });
  }

  const maximum = field.many ? maximumCount(field) : 1;
  if (maximum !== null && multilingualLanguagesOverLimit(value, maximum).length > 0) {
    issues.push({
      code: ValidationIssueCode.MaxCount,
      message:
        maximum === 1
          ? `${field.label} allows at most one value per language.`
          : `${field.label} allows at most ${maximum} values per language.`,
      path: fieldPath,
    });
  }

  if (field.many && hasDuplicateMultilingualValues(value)) {
    issues.push({
      code: ValidationIssueCode.Duplicate,
      message: `${field.label} contains duplicate values in one language.`,
      path: fieldPath,
    });
  }

  if (hasPatternMismatch(field, presentValues)) {
    issues.push(patternMismatchIssue(field, fieldPath));
  }
}

function hasPatternMismatch(field: FieldDescriptor, values: readonly string[]): boolean {
  if (!field.patterns?.length || values.length === 0) {
    return false;
  }
  let patterns: RegExp[];
  try {
    patterns = field.patterns.map((pattern) => new RegExp(pattern));
  } catch {
    // generation removes invalid patterns, but a manually edited descriptor must remain usable
    return false;
  }
  return values.some((value) => !patterns.some((pattern) => pattern.test(value)));
}

function patternMismatchIssue(field: FieldDescriptor, path: string): ValidationIssue {
  const patterns = field.patterns ?? [];
  const patternDescription =
    patterns.length === 1
      ? ` It must match this pattern: "${patterns[0]}".`
      : ` It must match one of these patterns: ${patterns
          .map((pattern) => `"${pattern}"`)
          .join(' or ')}.`;
  const example = field.examples?.[0];
  return {
    code: ValidationIssueCode.PatternMismatch,
    message:
      `${field.label} contains a value that does not match the required format.` +
      patternDescription +
      (example ? ` For example: ${example}.` : ''),
    path,
  };
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
  // only scalar values and entity references have a stable identity suitable for comparison
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
