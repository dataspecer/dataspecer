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
  navigation: GeneratedOperationNavigation;
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
  operation: Operation;
  pageComponentName: string;
  requiresEntityId: boolean;
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

export interface GeneratedOperationNavigation {
  pageActions: GeneratedNavigationActionDescriptor[];
  rowActions: GeneratedNavigationActionDescriptor[];
  associationActions: GeneratedAssociationNavigationActionDescriptor[];
}

export interface GeneratedNavigationActionDescriptor {
  id: string;
  label: string;
  targetPath: string;
  requiresEntityId: boolean;
}

export interface GeneratedAssociationNavigationActionDescriptor {
  id: string;
  fieldPath: string;
  targetPath: string;
  requiresEntityId: boolean;
}

export interface GeneratedListDescriptor {
  columns: GeneratedFieldDescriptor[];
}

export interface GeneratedDetailDescriptor {
  fields: GeneratedFieldDescriptor[];
}

// TODO: Replace the placeholder with real form descriptors once Create and Update forms are
//  implemented (should cover nested composition sub-forms and aggregation selectors)
export interface GeneratedFormDescriptor {
  fields: GeneratedFieldDescriptor[];
  placeholder: true;
}

// TODO: Replace the placeholder with a real delete descriptor once Delete confirmation pages,
//  usage check query, and cascade execution are implemented
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
  /** True for a reverse (inverse) relation, traversed backwards when read. */
  isReverse?: boolean;
  /** Nested fields of an inline association target. */
  fields?: GeneratedFieldDescriptor[];
}
