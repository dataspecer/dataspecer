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
  if (value instanceof Date) {
    return formatPrimitiveValue(value);
  }
  if (typeof value === 'object') {
    return formatObjectValue(field, value as Record<string, unknown>);
  }
  return formatPrimitiveValue(value);
}

function formatObjectValue(field: FieldDescriptor, value: Record<string, unknown>): string {
  // List columns show the first primitive nested field
  const firstPrimitive = (field.fields ?? []).find(
    (nested) => nested.kind === 'primitive' && value[nested.propertyName] != null
  );
  if (firstPrimitive) {
    return formatFieldValue(firstPrimitive, value[firstPrimitive.propertyName]);
  }
  const languageValue = formatLanguageMap(value);
  if (languageValue !== null) {
    return languageValue;
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
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  }
  if (typeof value === 'object') {
    const languageValue = formatLanguageMap(value as Record<string, unknown>);
    if (languageValue !== null) {
      return languageValue;
    }
    // A reference resolves to an entity IRI object, so fall back to its id.
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string') {
      return id;
    }
  }
  return JSON.stringify(value);
}

function formatLanguageMap(value: Record<string, unknown>): string | null {
  const entries = Object.entries(value).filter(([, entry]) => isLanguageValue(entry));
  if (entries.length === 0 || entries.length !== Object.keys(value).length) {
    return null;
  }

  const preferred =
    languageValueToString(value.en) ??
    languageValueToString(value.cs) ??
    entries.map(([, entry]) => languageValueToString(entry)).find((entry) => entry !== undefined);

  return preferred ?? '';
}

function isLanguageValue(value: unknown): boolean {
  return typeof value === 'string';
}

function languageValueToString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}
