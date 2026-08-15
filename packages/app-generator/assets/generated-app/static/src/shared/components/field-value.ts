import type { FieldDescriptor } from '../types/aggregate.ts';

const DATE_ONLY_DATATYPE = /#date$/;
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Formats a date in the reader's locale. */
export function formatDate(value: Date, field?: FieldDescriptor): string {
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  const dateOnly = field?.datatype ? DATE_ONLY_DATATYPE.test(field.datatype) : false;
  return dateOnly ? dateFormat.format(value) : dateTimeFormat.format(value);
}

/**
 * Formats a field value for single-line display in table cells and association summaries.
 * Associations with inline nested fields are summarized by their first primitive nested field.
 * Associations without a usable nested value fall back to the entity IRI.
 */
export function formatFieldValue(field: FieldDescriptor, value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => formatFieldValue(field, entry)).join(', ');
  }
  if (value instanceof Date) {
    return formatDate(value, field);
  }
  if (typeof value === 'object') {
    return formatObjectValue(field, value as Record<string, unknown>);
  }
  return formatPrimitiveValue(value);
}

function formatObjectValue(field: FieldDescriptor, value: Record<string, unknown>): string {
  // List columns summarize an object with its first primitive nested field.
  const firstPrimitive = (field.fields ?? []).find(
    (nested) => nested.kind === 'primitive' && value[nested.propertyName] != null
  );
  if (firstPrimitive) {
    return formatFieldValue(firstPrimitive, value[firstPrimitive.propertyName]);
  }
  if (typeof value.id === 'string') {
    return value.id;
  }
  return JSON.stringify(value);
}

export function formatPrimitiveValue(value: unknown, field?: FieldDescriptor): string {
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
    // A reference resolves to an entity IRI object, so fall back to its id.
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string') {
      return id;
    }
  }
  return JSON.stringify(value);
}
