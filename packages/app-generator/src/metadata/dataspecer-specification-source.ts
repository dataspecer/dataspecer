import type { CoreResource } from '@dataspecer/core/core';
import type { Entity } from '@dataspecer/core-v2/entity-model';
import type {
  SemanticModelClass,
  SemanticModelRelationship,
  SemanticModelRelationshipEnd,
} from '@dataspecer/core-v2/semantic-model/concepts';

/**
 * View over an aggregated semantic class for reading profile aggregation output. Profile
 * aggregation produces classes with `conceptIris` (see `AggregatedProfiledSemanticModelClass`
 * in `@dataspecer/core-v2`), while plain vocabulary classes lack the field. The field is
 * therefore optional here.
 */
export interface DataspecerSemanticModelClass extends SemanticModelClass {
  /**
   * IRIs of the original vocabulary concepts referenced by the profile.
   */
  conceptIris?: string[];
}

export interface DataspecerSemanticModelRelationshipEnd extends SemanticModelRelationshipEnd {
  /**
   * IRIs of the original vocabulary concepts referenced by the profile.
   */
  conceptIris?: string[];
}

export interface DataspecerSemanticModelRelationship extends SemanticModelRelationship {
  ends: DataspecerSemanticModelRelationshipEnd[];
}

/**
 * Entities returned by the root semantic model aggregator. The concrete entity shape depends on
 * the package's model composition, so the type is deliberately open. Typically the array contains
 * classes, relationships, and generalizations, and profile compositions add `conceptIris` to
 * classes and relationship ends. Consumers must narrow entities at runtime.
 */
export type DataspecerAggregatedSemanticModel = Entity[];

/**
 * A resource of a structure model. Stores can return any data PSM resource kind, for example
 * schemas, classes, attributes, association ends, class references, ORs, includes, and
 * containers. Consumers must discriminate at runtime and report kinds they do not support.
 */
export type DataspecerStructureResource = CoreResource;

export interface DataspecerSpecificationSource {
  /**
   * List of aggregated semantic model entities.
   */
  aggregatedSemanticModel: DataspecerAggregatedSemanticModel;
  /**
   * Array of structure models. Each structure model is an array of resources containing one
   * {@link DataPsmSchema} that is the root of the structure model.
   */
  structureModels: DataspecerStructureResource[][];
}

export type DataspecerSpecificationLoader = (
  dataSpecificationIri: string
) => Promise<DataspecerSpecificationSource>;
