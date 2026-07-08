import type { AssociationKind } from '../graph/types.ts';

export enum FieldKind {
  Primitive = 'primitive',
  Association = 'association',
}

export interface AggregateFieldMetadata {
  path: string;
  label: string;
  kind: FieldKind;
  /** IRI of the RDF predicate the field reads and writes. */
  propertyIri?: string;
  /** IRI of the value datatype for a primitive field, for example an xsd or OFN type. */
  datatype?: string;
  /**
   * Set only when the association target is another aggregate (a class reference or the root
   * class of another structure model). Mutually exclusive with the `fields` property.
   */
  targetAggregateIri?: string;
  /** IRI of the class the association points to. */
  targetClassIri?: string;
  associationKind?: AssociationKind;
  /**
   * True for a reverse (inverse) relation, where the predicate is traversed backwards. Reverse relations are read-only
   * so they appear in read schemas but not in create or update forms.
   */
  isReverse?: boolean;
  /** Whether the field holds more than one value (upper cardinality above one). */
  many?: boolean;
  /** Whether the field must have at least one value (lower cardinality of one or more). */
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
