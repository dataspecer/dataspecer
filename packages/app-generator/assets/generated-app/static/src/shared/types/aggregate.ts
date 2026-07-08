export enum FieldKind {
  Primitive = 'primitive',
  Association = 'association',
}

export enum AssociationKind {
  Composition = 'composition',
  Aggregation = 'aggregation',
}

export interface FieldDescriptor {
  path: string;
  propertyName: string;
  label: string;
  kind: FieldKind;
  datatype?: string;
  many: boolean;
  required: boolean;
  targetAggregateIri?: string;
  targetClassIri?: string;
  associationKind?: AssociationKind;
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
