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
  successRedirect?: GeneratedNavigationActionDescriptor;
  cancelTarget?: GeneratedNavigationActionDescriptor;
}

export interface GeneratedNavigationActionDescriptor {
  id: string;
  label: string;
  operation: Operation;
  targetTitle: string;
  targetPath: string;
  requiresEntityId: boolean;
}

export interface GeneratedAssociationNavigationActionDescriptor {
  id: string;
  fieldPath: string;
  targetPath: string;
  requiresEntityId: boolean;
}

export interface GeneratedDeleteDescriptor {
  cascadePaths: string[];
}

/** A selectable concrete shape for a specialized association. */
export interface GeneratedSpecializationDescriptor {
  /** Stable specialization identifier. Distinguishes choices sharing an RDF class. */
  specializationIri: string;
  /** Label shown in the specialization selector. */
  label: string;
  /** RDF class associated with this specialization. */
  classIri: string;
  /** Fields available when this specialization is selected. */
  fieldPaths: string[];
}

export interface GeneratedFieldDescriptor {
  path: string;
  label: string;
  /** Description shown alongside the generated field label. */
  description?: string;
  kind: FieldKind;
  propertyIri?: string;
  datatype?: string;
  many: boolean;
  required: boolean;
  minCount?: number;
  maxCount?: number | null;
  targetAggregateIri?: string;
  targetClassIri?: string;
  /** Specializations available for this association. */
  specializations?: GeneratedSpecializationDescriptor[];
  associationKind?: AssociationKind;
  /** True for a reverse (inverse) relation, traversed backwards when read. */
  isReverse?: boolean;
  /** Nested fields of an inline association target. */
  fields?: GeneratedFieldDescriptor[];
}
