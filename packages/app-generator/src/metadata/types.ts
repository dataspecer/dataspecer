import type { AssociationKind } from '../graph/types.ts';

export enum FieldKind {
  Primitive = 'primitive',
  Association = 'association',
}

/** Whether class instances must, may, or must not have an IRI. */
export type InstanceIdentityPolicy = 'ALWAYS' | 'OPTIONAL' | 'NEVER';

/** One supported direct class choice under a specialization (Or) association. */
export interface SpecializationMetadata {
  /** IRI of the Data PSM class choice. This distinguishes choices sharing an RDF class. */
  specializationIri: string;
  /** Display label used by the specialization selector. */
  label: string;
  /** Concrete RDF class written for newly created instances. */
  classIri: string;
  /** Fields applicable to this specialization, including fields shared by every choice. */
  fieldPaths: string[];
  /** Identity requirement declared by this specialization's structure class. */
  identityPolicy: InstanceIdentityPolicy;
}

export interface AggregateFieldMetadata {
  path: string;
  label: string;
  /** Description shown alongside the generated field label. */
  description?: string;
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
  /** Identity policy of a direct class target. Specialization choices carry their own policies. */
  targetIdentityPolicy?: InstanceIdentityPolicy;
  /** Concrete class choices when this association targets a specialization (Or). */
  specializations?: SpecializationMetadata[];
  associationKind?: AssociationKind;
  /**
   * True for a reverse (inverse) relation, where the predicate is traversed backwards. The
   * generated RDF adapter can edit reverse references as an extension to the specification by
   * writing the reversed triples outside LDKit.
   */
  isReverse?: boolean;
  /** Whether the field holds more than one value (upper cardinality above one). */
  many?: boolean;
  /** Whether the field must have at least one value (lower cardinality of one or more). */
  required?: boolean;
  /** Exact lower cardinality. Defaults to zero when the source does not provide it. */
  minCount?: number;
  /** Exact upper cardinality. Null means unbounded. */
  maxCount?: number | null;
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
