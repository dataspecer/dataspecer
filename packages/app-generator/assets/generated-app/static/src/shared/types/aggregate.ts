export type FieldKind = 'primitive' | 'association';

export type AssociationKind = 'composition' | 'aggregation';

export interface FieldDescriptor {
  path: string;
  propertyName: string;
  label: string;
  kind: FieldKind;
  propertyIri?: string;
  datatype?: string;
  many: boolean;
  required: boolean;
  targetAggregateIri?: string;
  targetClassIri?: string;
  associationKind?: AssociationKind;
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
