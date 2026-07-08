import type { FieldDescriptor, FormControl } from '../types/aggregate.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';

// The control a field maps to in the form. Beyond the primitive controls, a single-valued
// reference renders as a dropdown, and anything the first prototype cannot edit (repeating or
// nested composition fields) is shown read-only as "unsupported".
export type FieldControl = FormControl | 'reference' | 'unsupported';

export function resolveControl(field: FieldDescriptor): FieldControl {
  if (field.many) {
    return 'unsupported';
  }
  if (field.kind === 'association') {
    // TODO: Replace this shortcut with proper nested aggregation handling. For now,
    // aggregations are edited as IRI references even when metadata also exposes inline fields.
    if (field.associationKind === 'aggregation' && field.targetClassIri) {
      return 'reference';
    }
    return field.targetClassIri && !field.fields?.length ? 'reference' : 'unsupported';
  }
  return field.formControl ?? 'unsupported';
}

// Fields shown in the form, in descriptor order. Reverse relations are included: a single one
// edits as a reference dropdown and the datasource writes its reversed triple on save.
export function formFields(fields: readonly FieldDescriptor[]): FieldDescriptor[] {
  return [...fields];
}

// Converts a control's raw input into the value the model and LDKit expect. Empty text clears the
// value so an unset optional field is not written.
export function coerceValue(control: FieldControl, raw: string, checked: boolean): unknown {
  switch (control) {
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
    // datetime-local wants minutes precision, a date wants the day only.
    return control === 'datetime'
      ? value.toISOString().slice(0, 16)
      : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return '';
}

// Checks required fields client-side, including the generated IRI. Fields the prototype cannot
// edit are skipped rather than blocking the whole form.
export function validateModel(
  model: Record<string, unknown>,
  fields: readonly FieldDescriptor[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (typeof model.id !== 'string' || model.id.trim() === '') {
    issues.push({ code: 'required', message: 'Identifier (IRI) is required.', path: 'id' });
  }
  for (const field of fields) {
    if (!field.required || resolveControl(field) === 'unsupported') {
      continue;
    }
    if (isEmptyValue(model[field.propertyName])) {
      issues.push({ code: 'required', message: `${field.label} is required.`, path: field.path });
    }
  }
  return issues;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  // A reference value is an entity IRI object, empty until an IRI is chosen.
  if (typeof value === 'object' && !(value instanceof Date)) {
    const id = (value as { id?: unknown }).id;
    return typeof id !== 'string' || id.trim() === '';
  }
  return false;
}
