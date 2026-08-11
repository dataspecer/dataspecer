export type FieldKind = 'primitive' | 'association';

export type AssociationKind = 'composition' | 'aggregation';

/** The HTML form control a primitive field maps to in generated forms. */
export type FormControl = 'text' | 'number' | 'date' | 'datetime' | 'checkbox';

export interface FieldDescriptor {
  path: string;
  propertyName: string;
  label: string;
  kind: FieldKind;
  /** IRI of the RDF predicate the field reads and writes. */
  propertyIri?: string;
  /** IRI of the value datatype for a primitive field, for example an xsd or OFN type. */
  datatype?: string;
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
  createEmpty(): TModel;
}

export type AggregateDescriptorMap = Record<string, AggregateDescriptor>;

export interface EntityModel {
  id?: string;
}

export type EntityRecord = EntityModel & Record<string, unknown>;

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
