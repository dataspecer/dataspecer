import {
  fieldValues,
  isEntityRecord,
  MISSING_ENTITY_PROPERTY,
  referenceIdOf,
  RDF_TYPES_PROPERTY,
  SPECIALIZATION_IRI_PROPERTY,
  type EntityRecord,
  type FieldDescriptor,
  type SpecializationDescriptor,
} from '../types/aggregate.ts';
import { isCompositionField, isInlineCompositionField } from '../forms/entity-target.ts';
import { joinFieldPath } from '../forms/field-path.ts';
import { isSafeAbsoluteIri, requireSafeAbsoluteIri } from '../forms/iri.ts';
import {
  compactMultilingualValue,
  isMultilingualField,
  normalizeMultilingualValue,
} from '../forms/multilingual-value.ts';
import { effectiveFields, resolveLoadedSpecialization } from '../forms/specialization.ts';

type LdkitMutationMode = 'create' | 'update';

/**
 * Converts an LDKit entity to the model shape used by generated forms. Composed children synthesized
 * by the read are marked so they can be distinguished from stored children with empty fields.
 */
export function normalizeLdkitEntity(
  value: unknown,
  fields: readonly FieldDescriptor[],
  missingNodeIds: ReadonlySet<string> = new Set(),
): unknown {
  function normalizeEntity(
    value: unknown,
    fields: readonly FieldDescriptor[],
    specializations?: readonly SpecializationDescriptor[],
    composed = false,
  ): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => normalizeEntity(entry, fields, specializations, composed));
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
      if (field && isMultilingualField(field)) {
        result[key] =
          nested === null || nested === undefined
            ? nested
            : normalizeMultilingualValue(nested, field.label);
      } else if (field?.kind === 'association') {
        result[key] = isInlineCompositionField(field)
          ? normalizeEntity(nested, field.fields ?? [], field.specializations, true)
          : normalizeReference(nested, field);
      } else {
        result[key] = normalizeUnknown(nested);
      }
    }
    if (typeof source.$id === 'string') {
      result.id = source.$id;
    }
    // only owned children have the flag because only they are written back
    if (composed && typeof result.id === 'string' && missingNodeIds.has(result.id)) {
      result[MISSING_ENTITY_PROPERTY] = true;
    }
    if (!specializations?.length) {
      return result;
    }
    const shape = { fields, specializations };
    return resolveLoadedSpecialization(shape, result);
  }

  function normalizeReference(value: unknown, field: FieldDescriptor): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => normalizeReference(entry, field));
    }
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === 'string') {
      return { id: requireSafeAbsoluteIri(value, `${field.label} reference IRI`) };
    }
    // reference whose target has display fields is read as an entity, so views can label the link
    if (typeof value === 'object') {
      const entity = normalizeEntity(value, field.fields ?? []) as Record<string, unknown>;
      if (typeof entity.id !== 'string') {
        throw new Error(`${field.label} must contain an IRI reference.`);
      }
      entity.id = requireSafeAbsoluteIri(entity.id, `${field.label} reference IRI`);
      return entity;
    }
    throw new Error(`${field.label} must contain an IRI reference.`);
  }

  return normalizeEntity(value, fields);
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

/** Rejects composed blank nodes and other child identities that the application cannot edit. */
export function requireNamedCompositionIris(
  model: EntityRecord,
  fields: readonly FieldDescriptor[],
  pathPrefix = '',
): void {
  const record = model as Record<string, unknown>;
  for (const field of fields) {
    if (!isCompositionField(field)) {
      continue;
    }
    const fieldPath = joinFieldPath(pathPrefix, field.path);
    const values = fieldValues(record[field.propertyName], field);
    const childShape = isInlineCompositionField(field)
      ? { fields: field.fields ?? [], specializations: field.specializations }
      : undefined;
    values.forEach((value, index) => {
      const valuePath = field.many ? `${fieldPath}[${index}]` : fieldPath;
      if (!isEntityRecord(value) || typeof value.id !== 'string' || !isSafeAbsoluteIri(value.id)) {
        throw new Error(
          `Composed entity "${valuePath}" must have a safe absolute IRI. ` +
            'Blank-node compositions are not editable by this generated application.',
        );
      }
      if (childShape) {
        requireNamedCompositionIris(value, effectiveFields(childShape, value), valuePath);
      }
    });
  }
}

/** Converts model ids to LDKit $id values. Updates keep null and [] because they clear properties. */
export function toLdkitEntity(
  value: unknown,
  mode: LdkitMutationMode,
  fields: readonly FieldDescriptor[] = [],
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
    if (
      key === SPECIALIZATION_IRI_PROPERTY ||
      key === RDF_TYPES_PROPERTY ||
      key === MISSING_ENTITY_PROPERTY
    ) {
      // runtime state must never become RDF data
      continue;
    }
    const field = fieldByProperty.get(key);
    const converted = field ? toLdkitFieldValue(nested, field, mode) : toLdkitEntity(nested, mode);
    if (converted !== undefined) {
      result[key] = converted;
    }
  }
  // drop objects with no remaining properties, for example an unset reference
  return Object.keys(result).length > 0 ? result : undefined;
}

function toLdkitFieldValue(
  value: unknown,
  field: FieldDescriptor,
  mode: LdkitMutationMode,
): unknown {
  if (isMultilingualField(field)) {
    return toLdkitMultilingual(value, field, mode);
  }
  return field.kind === 'association'
    ? toLdkitReference(value, field, mode)
    : toLdkitEntity(value, mode);
}

function toLdkitMultilingual(
  value: unknown,
  field: FieldDescriptor,
  mode: LdkitMutationMode,
): unknown {
  if (value === null) {
    return mode === 'update' ? null : undefined;
  }
  const multilingual = compactMultilingualValue(value, field.label);
  if (Object.keys(multilingual).length === 0) {
    return mode === 'update' ? null : undefined;
  }
  return multilingual;
}

function toLdkitReference(
  value: unknown,
  field: FieldDescriptor,
  mode: LdkitMutationMode,
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
  const id = referenceIdOf(value);
  if (id === '') {
    return null;
  }
  return requireSafeAbsoluteIri(id, `${field.label} reference IRI`);
}
