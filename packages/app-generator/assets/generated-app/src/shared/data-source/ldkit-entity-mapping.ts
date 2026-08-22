import type { FieldDescriptor } from '../types/aggregate.ts';
import { fieldValues, isEntityRecord, type EntityRecord } from '../types/aggregate.ts';
import { isCompositionField } from '../forms/entity-target.ts';
import { isSafeAbsoluteIri, requireSafeAbsoluteIri } from '../forms/iri.ts';

/** Converts LDKit's entity representation to the model shape used by generated forms. */
export function normalizeLdkitEntity(value: unknown, fields: readonly FieldDescriptor[]): unknown {
  return normalizeEntity(value, fields);
}

function normalizeEntity(value: unknown, fields: readonly FieldDescriptor[]): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeEntity(entry, fields));
  }
  if (value === null || typeof value !== 'object' || value instanceof Date) {
    return value;
  }

  const source = value as Record<string, unknown>;
  const fieldByProperty = new Map(fields.map((field) => [field.propertyName, field]));
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(source)) {
    if (key === '$id') {
      continue;
    }
    const field = fieldByProperty.get(key);
    if (field?.kind === 'association') {
      result[key] = readsInlineComposition(field)
        ? normalizeEntity(nested, field.fields ?? [])
        : normalizeReference(nested, field);
    } else {
      result[key] = normalizeUnknown(nested);
    }
  }
  if (typeof source.$id === 'string') {
    result.id = source.$id;
  }
  return result;
}

function normalizeReference(value: unknown, field: FieldDescriptor): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeReference(entry, field));
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== 'string') {
    throw new Error(`${field.label} must contain an IRI reference.`);
  }
  return { id: requireSafeAbsoluteIri(value, `${field.label} reference IRI`) };
}

function normalizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeUnknown);
  }
  if (value === null || typeof value !== 'object' || value instanceof Date) {
    return value;
  }
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(source)) {
    if (key !== '$id') {
      result[key] = normalizeUnknown(nested);
    }
  }
  if (typeof source.$id === 'string') {
    result.id = source.$id;
  }
  return result;
}

/** Rejects composed blank nodes and other child identities that this application cannot edit. */
export function requireNamedCompositionIris(
  model: EntityRecord,
  fields: readonly FieldDescriptor[],
  pathPrefix = ''
): void {
  const record = model as Record<string, unknown>;
  for (const field of fields) {
    if (!isCompositionField(field)) {
      continue;
    }
    const fieldPath = pathPrefix ? `${pathPrefix}.${field.path}` : field.path;
    const values = fieldValues(record[field.propertyName], field);
    values.forEach((value, index) => {
      const valuePath = field.many ? `${fieldPath}[${index}]` : fieldPath;
      if (!isEntityRecord(value) || typeof value.id !== 'string' || !isSafeAbsoluteIri(value.id)) {
        throw new Error(
          `Composed entity "${valuePath}" must have a safe absolute IRI. ` +
            'Blank-node compositions are not editable by this generated application.'
        );
      }
      if (readsInlineComposition(field)) {
        requireNamedCompositionIris(value, field.fields ?? [], valuePath);
      }
    });
  }
}

function readsInlineComposition(field: FieldDescriptor): boolean {
  return Boolean(
    isCompositionField(field) &&
    !field.targetAggregateIri &&
    field.targetClassIri &&
    field.fields !== undefined
  );
}

/**
 * Converts generated model ids to LDKit's $id form. Update keeps null and empty arrays because
 * Lens.update uses them to clear supplied properties.
 */
export function toLdkitEntity(
  value: unknown,
  mode: 'create' | 'update',
  fields: readonly FieldDescriptor[] = []
): unknown {
  if (Array.isArray(value)) {
    const entries = value
      .map((entry) => toLdkitEntity(entry, mode, fields))
      .filter((entry) => entry !== undefined);
    return mode === 'update' || entries.length > 0 ? entries : undefined;
  }
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return mode === 'update' ? null : undefined;
  }
  if (value === '') {
    return undefined;
  }
  if (typeof value !== 'object' || value instanceof Date) {
    return value;
  }
  const source = value as Record<string, unknown>;
  const fieldByProperty = new Map(fields.map((field) => [field.propertyName, field]));
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(source)) {
    if (key === 'id') {
      if (nested !== '') {
        result.$id = requireSafeAbsoluteIri(nested, 'Payload id');
      }
      continue;
    }
    if (key === '__specializationIri' || key === '__rdfTypes') {
      continue;
    }
    const field = fieldByProperty.get(key);
    const converted =
      field?.kind === 'association'
        ? toLdkitReference(nested, field, mode)
        : toLdkitEntity(nested, mode);
    if (converted !== undefined) {
      result[key] = converted;
    }
  }
  // An object that keeps no properties (for example an unset reference) is dropped entirely.
  return Object.keys(result).length > 0 ? result : undefined;
}

function toLdkitReference(
  value: unknown,
  field: FieldDescriptor,
  mode: 'create' | 'update'
): unknown {
  if (value === null) {
    return mode === 'update' ? null : undefined;
  }
  if (value === undefined || value === '') {
    return undefined;
  }
  if (field.many) {
    if (!Array.isArray(value)) {
      throw new Error(`${field.label} must contain a list of IRI references.`);
    }
    const iris = value.flatMap((entry) => {
      const iri = referenceIri(entry, field);
      return iri === null ? [] : [iri];
    });
    return mode === 'update' || iris.length > 0 ? iris : undefined;
  }
  return referenceIri(value, field) ?? undefined;
}

function referenceIri(value: unknown, field: FieldDescriptor): string | null {
  const id = typeof value === 'string' ? value : isEntityRecord(value) ? value.id : undefined;
  if (id === '') {
    return null;
  }
  return requireSafeAbsoluteIri(id, `${field.label} reference IRI`);
}
