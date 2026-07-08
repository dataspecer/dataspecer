export type FieldKind = 'primitive' | 'association';

export type AssociationKind = 'composition' | 'aggregation';

/** The HTML form control a primitive field maps to in the generated Create form. */
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

export interface EntityModel {
  id?: string;
}
