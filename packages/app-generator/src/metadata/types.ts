export enum FieldKind {
  Primitive = 'primitive',
  Association = 'association',
}

export enum AssociationKind {
  Composition = 'composition',
  Aggregation = 'aggregation',
}

export interface AggregateFieldMetadata {
  path: string;
  label: string;
  kind: FieldKind;
  datatype?: string;
  targetAggregateIri?: string;
  targetClassIri?: string;
  associationKind?: AssociationKind;
  many?: boolean;
  required?: boolean;
}

export interface AggregateMetadata {
  iri: string;
  name: string;
  classIri: string;
  fields: AggregateFieldMetadata[];
}

export interface DataspecerSpecificationMetadata {
  dataSpecificationIri: string;
  aggregates: AggregateMetadata[];
}
