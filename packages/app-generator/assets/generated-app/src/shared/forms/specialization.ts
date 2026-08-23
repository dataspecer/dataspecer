import {
  RDF_TYPES_PROPERTY,
  type EntityRecord,
  type FieldDescriptor,
  type SpecializationDescriptor,
} from '../types/aggregate.ts';
import { isMultilingualField, nonEmptyMultilingualValues } from './multilingual-value.ts';

export interface SpecializableEntityShape {
  /** Complete field union across all specializations. */
  fields: readonly FieldDescriptor[];
  specializations?: readonly SpecializationDescriptor[];
}

export type SpecializationResolution =
  | { kind: 'selected'; specialization: SpecializationDescriptor }
  | { kind: 'ambiguous' }
  | { kind: 'conflicting' };

/**
 * Returns fields for the selected specialization. New entities expose only shared fields before
 * selection, while unresolved loaded entities expose the complete union.
 */
export function effectiveFields(
  shape: SpecializableEntityShape,
  entity: EntityRecord
): FieldDescriptor[] {
  const { fields, specializations } = shape;
  if (!specializations?.length) {
    return [...fields];
  }

  const selected = specializations.find(
    (specialization) => specialization.specializationIri === entity.__specializationIri
  );
  if (selected) {
    const selectedPaths = new Set(selected.fieldPaths);
    return fields.filter((field) => selectedPaths.has(field.path));
  }

  // the read normalizer adds this property even when stored RDF contains no matching type
  if (Object.hasOwn(entity, RDF_TYPES_PROPERTY)) {
    return [...fields];
  }
  const sharedPaths = sharedFieldPaths(specializations);
  return fields.filter((field) => sharedPaths.has(field.path));
}

/** Resolves a loaded specialization from RDF types and branch-exclusive populated fields. */
export function resolveSpecialization(
  shape: SpecializableEntityShape,
  entity: EntityRecord
): SpecializationResolution {
  const specializations = shape.specializations ?? [];
  if (specializations.length === 0) {
    return { kind: 'ambiguous' };
  }

  const rdfTypes = normalizedRdfTypes(entity.__rdfTypes);
  const matchedByType = specializations.filter((specialization) =>
    rdfTypes.includes(specialization.classIri)
  );
  const exclusiveFieldEvidence = new Set<string>();
  const matchedClasses = new Set(matchedByType.map((specialization) => specialization.classIri));
  if (matchedClasses.size > 1) {
    return { kind: 'conflicting' };
  }
  const typeEvidence = matchedByType.length === 1 ? matchedByType[0] : undefined;

  const classCounts = countByClass(specializations);
  const memberships = fieldMemberships(specializations);
  for (const field of shape.fields) {
    const members = memberships.get(field.path) ?? [];
    if (members.length !== 1 || !hasPopulatedValue(field, entity[field.propertyName])) {
      continue;
    }
    const specialization = members[0];
    exclusiveFieldEvidence.add(specialization.specializationIri);
  }

  if (exclusiveFieldEvidence.size > 1) {
    return { kind: 'conflicting' };
  }
  const [fieldEvidenceIri] = exclusiveFieldEvidence;
  const fieldEvidence = fieldEvidenceIri
    ? specializations.find((candidate) => candidate.specializationIri === fieldEvidenceIri)
    : undefined;
  if (fieldEvidence && matchedClasses.size > 0 && !matchedClasses.has(fieldEvidence.classIri)) {
    return { kind: 'conflicting' };
  }
  if (typeEvidence) {
    return { kind: 'selected', specialization: typeEvidence };
  }
  if (fieldEvidence && (classCounts.get(fieldEvidence.classIri) ?? 0) > 1) {
    return { kind: 'selected', specialization: fieldEvidence };
  }
  return { kind: 'ambiguous' };
}

/** Records the RDF type evidence and the specialization it identifies on a loaded entity. */
export function resolveLoadedSpecialization(
  shape: SpecializableEntityShape,
  entity: EntityRecord
): EntityRecord {
  if (!shape.specializations?.length) {
    return entity;
  }
  const loaded: EntityRecord = {
    ...entity,
    __rdfTypes: normalizedRdfTypes(entity.__rdfTypes),
  };
  delete loaded.__specializationIri;
  const resolution = resolveSpecialization(shape, loaded);
  if (resolution.kind === 'selected') {
    loaded.__specializationIri = resolution.specialization.specializationIri;
  }
  return loaded;
}

/** Returns whether the selected same-class specialization can be recognized after another read. */
export function hasSelectedBranchEvidence(
  shape: SpecializableEntityShape,
  entity: EntityRecord,
  specialization: SpecializationDescriptor
): boolean {
  const specializations = shape.specializations ?? [];
  if (
    specializations.filter((candidate) => candidate.classIri === specialization.classIri).length < 2
  ) {
    return true;
  }
  const memberships = fieldMemberships(specializations);
  return shape.fields.some((field) => {
    const members = memberships.get(field.path) ?? [];
    return (
      members.length === 1 &&
      members[0].specializationIri === specialization.specializationIri &&
      hasPopulatedValue(field, entity[field.propertyName])
    );
  });
}

export function selectedSpecialization(
  shape: SpecializableEntityShape,
  entity: EntityRecord
): SpecializationDescriptor | undefined {
  return shape.specializations?.find(
    (specialization) => specialization.specializationIri === entity.__specializationIri
  );
}

function sharedFieldPaths(
  specializations: readonly SpecializationDescriptor[]
): ReadonlySet<string> {
  const [first, ...rest] = specializations;
  if (!first) {
    return new Set();
  }
  return new Set(
    first.fieldPaths.filter((path) =>
      rest.every((specialization) => specialization.fieldPaths.includes(path))
    )
  );
}

function fieldMemberships(
  specializations: readonly SpecializationDescriptor[]
): Map<string, SpecializationDescriptor[]> {
  const result = new Map<string, SpecializationDescriptor[]>();
  for (const specialization of specializations) {
    for (const path of specialization.fieldPaths) {
      result.set(path, [...(result.get(path) ?? []), specialization]);
    }
  }
  return result;
}

function countByClass(
  specializations: readonly SpecializationDescriptor[]
): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  for (const specialization of specializations) {
    result.set(specialization.classIri, (result.get(specialization.classIri) ?? 0) + 1);
  }
  return result;
}

function normalizedRdfTypes(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
    throw new Error('Stored RDF types must contain a list of IRIs.');
  }
  return [...new Set(value)];
}

function hasPopulatedValue(field: FieldDescriptor, value: unknown): boolean {
  if (isMultilingualField(field)) {
    return nonEmptyMultilingualValues(value).length > 0;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasBasicValue(entry));
  }
  return hasBasicValue(value);
}

function hasBasicValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' && id.trim() !== '';
  }
  return true;
}
