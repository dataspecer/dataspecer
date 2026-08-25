import { referenceIdOf, type FieldDescriptor } from '../types/aggregate.ts';
import { isMultilingualField, selectMultilingualValues } from './multilingual-value.ts';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
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
  preferredLanguages: readonly string[] = []
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
  preferredLanguages: readonly string[]
): string {
  // List columns summarize an object with its first primitive nested field.
  const firstPrimitive = (field.fields ?? []).find(
    (nested) => nested.kind === 'primitive' && value[nested.propertyName] != null
  );
  if (firstPrimitive) {
    return formatFieldValue(firstPrimitive, value[firstPrimitive.propertyName], preferredLanguages);
  }
  const id = referenceIdOf(value);
  if (id !== undefined) {
    return id;
  }
  return JSON.stringify(value);
}

export function formatPrimitiveValue(
  value: unknown,
  field?: FieldDescriptor,
  preferredLanguages: readonly string[] = []
): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
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
