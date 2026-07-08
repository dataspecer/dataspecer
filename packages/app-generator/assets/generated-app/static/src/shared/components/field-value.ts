import type { FieldDescriptor } from '../types/aggregate.ts';

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
  if (typeof value === 'object') {
    return formatObjectValue(field, value as Record<string, unknown>);
  }
  return formatPrimitiveValue(value);
}

function formatObjectValue(field: FieldDescriptor, value: Record<string, unknown>): string {
  // TODO: Show all primitive nested fields comma separated and use this fallback policy: name -> title -> label -> IRI
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

export function formatPrimitiveValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}
