import type { AssociationKind } from '../graph/types.ts';

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
  /**
   * Set only when the association target is another aggregate (a class reference or the root
   * class of another structure model). Mutually exclusive with the `fields` property.
   */
  targetAggregateIri?: string;
  targetClassIri?: string;
  associationKind?: AssociationKind;
  many?: boolean;
  required?: boolean;
  /**
   * Fields exposed inline by the association target class within this aggregate's structure
   * tree. Present only for associations whose target is defined inline, not for references to
   * other aggregates.
   */
  fields?: AggregateFieldMetadata[];
}

export interface AggregateMetadata {
  iri: string;
  name: string;
  classIri: string;
  fields: AggregateFieldMetadata[];
}

export interface SpecificationMetadata {
  dataSpecificationIri: string;
  aggregates: AggregateMetadata[];
}

/**
 * Boundary through which the generator obtains metadata about Dataspecer artifacts. Generator
 * core depends only on this interface, never on concrete Dataspecer API clients.
 */
export interface DataspecerMetadataProvider {
  getSpecificationMetadata(dataSpecificationIri: string): Promise<SpecificationMetadata>;
}
