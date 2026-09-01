import { referenceIdOf, type FieldDescriptor } from '../types/aggregate.ts';
import { isMultilingualField, selectMultilingualValues } from './multilingual-value.ts';

// Date-only values use UTC midnight and must also be formatted in UTC.
const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeZone: 'UTC',
});
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h23',
});

/** Formats a date in the reader's locale. */
function formatDate(value: Date, field?: FieldDescriptor): string {
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  return field?.formControl === 'date' ? dateFormat.format(value) : dateTimeFormat.format(value);
}

/**
 * Formats a field value for single-line display in table cells and association summaries.
 * Associations with inline nested fields are summarized by their first primitive nested field.
 * Associations without a usable nested value fall back to the entity IRI.
 */
export function formatFieldValue(
  field: FieldDescriptor,
  value: unknown,
  preferredLanguages: readonly string[] = [],
): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (isMultilingualField(field)) {
    return selectMultilingualValues(value, preferredLanguages)?.values.join(', ') ?? '';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => formatFieldValue(field, entry, preferredLanguages)).join(', ');
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    return formatObjectValue(field, value as Record<string, unknown>, preferredLanguages);
  }
  return formatPrimitiveValue(value, field, preferredLanguages);
}

function formatObjectValue(
  field: FieldDescriptor,
  value: Record<string, unknown>,
  preferredLanguages: readonly string[],
): string {
  // an object is summarized by its first primitive nested field that has something to show
  for (const nested of field.fields ?? []) {
    if (nested.kind !== 'primitive') {
      continue;
    }
    const formatted = formatFieldValue(nested, value[nested.propertyName], preferredLanguages);
    if (formatted !== '') {
      return formatted;
    }
  }
  const id = referenceIdOf(value);
  if (id !== undefined) {
    const expectedDisplayDetails =
      field.kind === 'association' &&
      field.associationKind !== 'composition' &&
      field.fields?.some(
        (nested) => nested.kind === 'primitive' && Object.hasOwn(value, nested.propertyName),
      );
    return expectedDisplayDetails ? `${id} (details unavailable)` : id;
  }
  return JSON.stringify(value);
}

export function formatPrimitiveValue(
  value: unknown,
  field?: FieldDescriptor,
  preferredLanguages: readonly string[] = [],
): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (value instanceof Date) {
    return formatDate(value, field);
  }
  if (typeof value === 'object') {
    if (field && isMultilingualField(field)) {
      return selectMultilingualValues(value, preferredLanguages)?.values.join(', ') ?? '';
    }
    // A reference resolves to an entity IRI object, so fall back to its id.
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string') {
      return id;
    }
  }
  return JSON.stringify(value);
}
