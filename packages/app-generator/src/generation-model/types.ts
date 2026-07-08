import type { AssociationKind, DatasourceType, Operation } from '../graph/types.ts';
import { type FieldKind } from '../metadata/types.ts';

export interface GenerationModel {
  app: GeneratedAppDescriptor;
  datasource: GeneratedDatasourceDescriptor;
  aggregates: GeneratedAggregateDescriptor[];
  operations: GeneratedOperationDescriptor[];
  routes: GeneratedRouteDescriptor[];
  navigation: GeneratedNavigationDescriptor[];
  redirects: GeneratedRedirectDescriptor[];
}

export interface GeneratedAppDescriptor {
  name: string;
  safeName: string;
  dataSpecificationIri: string;
}

export interface GeneratedDatasourceDescriptor {
  id: string;
  type: DatasourceType.Rdf;
  endpoint: string;
}

export interface GeneratedAggregateDescriptor {
  iri: string;
  name: string;
  safeName: string;
  classIri: string;
  fields: GeneratedFieldDescriptor[];
}

export interface GeneratedOperationDescriptor {
  id: string;
  nodeId: string;
  aggregateIri: string;
  aggregateName: string;
  operation: Operation;
  routeId: string;
  pageComponentName: string;
  pageTitle: string;
  list?: GeneratedListDescriptor;
  detail?: GeneratedDetailDescriptor;
  form?: GeneratedFormDescriptor;
  delete?: GeneratedDeleteDescriptor;
}

export interface GeneratedRouteDescriptor {
  id: string;
  nodeId: string;
  path: string;
  operationId: string;
  pageComponentName: string;
}

export interface GeneratedNavigationDescriptor {
  id: string;
  sourceOperationId: string;
  targetOperationId: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface GeneratedRedirectDescriptor {
  id: string;
  sourceOperationId: string;
  targetOperationId: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export interface GeneratedListDescriptor {
  columns: GeneratedFieldDescriptor[];
}

export interface GeneratedDetailDescriptor {
  fields: GeneratedFieldDescriptor[];
}

export interface GeneratedFormDescriptor {
  fields: GeneratedFieldDescriptor[];
  placeholder: true;
}

export interface GeneratedDeleteDescriptor {
  cascadePaths: string[];
  placeholder: true;
}

export interface GeneratedFieldDescriptor {
  path: string;
  label: string;
  kind: FieldKind;
  propertyIri?: string;
  datatype?: string;
  many: boolean;
  required: boolean;
  targetAggregateIri?: string;
  targetClassIri?: string;
  associationKind?: AssociationKind;
  /** Nested fields of an inline association target. */
  fields?: GeneratedFieldDescriptor[];
}
