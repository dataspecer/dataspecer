import type { AssociationKind, DatasourceType, Operation } from '../graph/types.ts';
import { type FieldKind } from '../metadata/types.ts';

export const SPECIALIZATION_IRI_PROPERTY = '__specializationIri';
export const RDF_TYPES_PROPERTY = '__rdfTypes';
export const RESERVED_ENTITY_PROPERTY_NAMES: readonly string[] = [
  'id',
  SPECIALIZATION_IRI_PROPERTY,
  RDF_TYPES_PROPERTY,
];

export interface GenerationModel {
  app: GeneratedAppDescriptor;
  datasource: GeneratedDatasourceDescriptor;
  aggregates: GeneratedAggregateDescriptor[];
  operations: GeneratedOperationDescriptor[];
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
  aggregateIri: string;
  aggregateName: string;
  operation: Operation;
  routeId: string;
  path: string;
  requiresEntityId: boolean;
  pageComponentName: string;
  pageTitle: string;
  navigation: GeneratedOperationNavigation;
  delete?: GeneratedDeleteDescriptor;
}

export interface GeneratedNavigationDescriptor {
  id: string;
  sourceOperationId: string;
  targetOperationId: string;
}

export interface GeneratedRedirectDescriptor {
  id: string;
  sourceOperationId: string;
  targetOperationId: string;
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
  /** Regular expressions accepted for editable string values. A value may match any of the provided patterns. */
  patterns?: string[];
  /** Example values displayed as input placeholders when the control supports them. */
  examples?: string[];
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
