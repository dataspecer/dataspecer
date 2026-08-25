export type FieldKind = 'primitive' | 'association';

export type AssociationKind = 'composition' | 'aggregation';

export const SPECIALIZATION_IRI_PROPERTY = '__specializationIri';
export const RDF_TYPES_PROPERTY = '__rdfTypes';

/** A selectable concrete shape for a specialized association. */
export interface SpecializationDescriptor {
  /** Stable specialization identifier. Distinguishes choices sharing an RDF class. */
  specializationIri: string;
  /** Label shown in the specialization selector. */
  label: string;
  /** RDF class associated with this specialization. */
  classIri: string;
  /** Fields available when this specialization is selected. */
  fieldPaths: string[];
}

/** The HTML form control a primitive field maps to in generated forms. */
export type FormControl =
  | 'text'
  | 'integer'
  | 'number'
  | 'date'
  | 'datetime'
  | 'checkbox'
  | 'multilingual';

/** Language tags map to every literal stored in that language. The empty tag is untagged text. */
export type MultilingualValue = Record<string, string[]>;

export interface FieldDescriptor {
  path: string;
  propertyName: string;
  label: string;
  /** Description shown in the field label tooltip. */
  description?: string;
  kind: FieldKind;
  /** IRI of the RDF predicate the field reads and writes. */
  propertyIri?: string;
  /** IRI of the value datatype for a primitive field, for example an xsd or OFN type. */
  datatype?: string;
  /** Regular expressions accepted for editable string values. A value may match any of the provided patterns. */
  patterns?: string[];
  /** Example values displayed as input placeholders when the control supports them. */
  examples?: string[];
  /** Form control for an editable primitive field. Absent for associations. */
  formControl?: FormControl;
  /** Whether the field holds more than one value (upper cardinality above one). */
  many: boolean;
  /** Whether the field must have at least one value (lower cardinality of one or more). */
  required: boolean;
  /** Exact lower cardinality when the source provides it. */
  minCount?: number;
  /** Exact upper cardinality when the source provides it. Null means unbounded. */
  maxCount?: number | null;
  /**
   * Set only when the association target is another aggregate (a class reference or the root
   * class of another structure model). Mutually exclusive with the `fields` property.
   */
  targetAggregateIri?: string;
  /** IRI of the class the association points to. */
  targetClassIri?: string;
  /** Specializations available for this association. */
  specializations?: SpecializationDescriptor[];
  associationKind?: AssociationKind;
  /**
   * True for a reverse (inverse) relation. Read backwards, and on create written as a reversed
   * triple, because LDKit ignores @inverse on insert.
   */
  isReverse?: boolean;
  /** Nested fields of an association whose target is defined inline. */
  fields?: FieldDescriptor[];
}

export interface AggregateDescriptor<TModel extends EntityModel = EntityModel> {
  iri: string;
  name: string;
  classIri: string;
  fields: FieldDescriptor[];
  createEmpty(): Partial<TModel>;
}

/** Aggregate descriptors keyed by IRI so fields can resolve referenced structures. */
export type AggregateDescriptorMap = Record<string, AggregateDescriptor>;

export interface EntityModel {
  id?: string;
}

/** State carried by editable records but excluded from generated domain models and RDF writes. */
export interface EntityRuntimeState {
  /** Identifies the selected specialization, including choices that share an RDF class. */
  [SPECIALIZATION_IRI_PROPERTY]?: string;
  /** RDF types retained as evidence when resolving the specialization of a loaded entity. */
  [RDF_TYPES_PROPERTY]?: string[];
}

export type EntityRecord = EntityModel & EntityRuntimeState & Record<string, unknown>;

export function fieldValues(value: unknown, field: FieldDescriptor): unknown[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (field.many) {
    if (!Array.isArray(value)) {
      throw new Error(`${field.label} must contain a list of values.`);
    }
    return value;
  }
  return [value];
}

export function isEntityRecord(value: unknown): value is EntityRecord {
  if (
    value === null ||
    typeof value !== 'object' ||
    value instanceof Date ||
    Array.isArray(value)
  ) {
    return false;
  }
  const id = (value as { id?: unknown }).id;
  return id === undefined || typeof id === 'string';
}

/** Returns an IRI-shaped identifier from a reference string or object. */
export function referenceIdOf(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  return isEntityRecord(value) && typeof value.id === 'string' ? value.id : undefined;
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.every(isEmptyValue);
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime());
  }
  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id !== 'string' || id.trim() === '';
  }
  return false;
}
