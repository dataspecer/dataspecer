import type { AssociationKind } from '../graph/types.ts';
export { AssociationKind } from '../graph/types.ts';

export enum FieldKind {
  Primitive = 'primitive',
  Association = 'association',
}

export interface AggregateFieldMetadata {
  path: string;
  label: string;
  kind: FieldKind;
  propertyIri?: string;
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
