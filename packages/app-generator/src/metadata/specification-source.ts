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
export interface AggregatedSemanticModelClass extends SemanticModelClass {
  /**
   * IRIs of the original vocabulary concepts referenced by the profile.
   */
  conceptIris?: string[];
}

export interface AggregatedSemanticModelRelationshipEnd extends SemanticModelRelationshipEnd {
  /**
   * IRIs of the original vocabulary concepts referenced by the profile.
   */
  conceptIris?: string[];
}

export interface AggregatedSemanticModelRelationship extends SemanticModelRelationship {
  ends: AggregatedSemanticModelRelationshipEnd[];
}

/**
 * Entities returned by the root semantic model aggregator. The concrete entity shape depends on
 * the package's model composition, so the type is deliberately open. Typically the array contains
 * classes, relationships, and generalizations, and profile compositions add `conceptIris` to
 * classes and relationship ends. Consumers must narrow entities at runtime.
 */
export type AggregatedSemanticModel = Entity[];

/**
 * A resource of a structure model. Stores can return any data PSM resource kind, for example
 * schemas, classes, attributes, association ends, class references, ORs, includes, and
 * containers. Consumers must discriminate at runtime and report kinds they do not support.
 */
export type StructureModelResource = CoreResource;

export interface SpecificationSource {
  /**
   * List of aggregated semantic model entities.
   */
  aggregatedSemanticModel: AggregatedSemanticModel;
  /**
   * Array of structure models. Each structure model is an array of resources containing one
   * DataPsmSchema that is the root of the structure model.
   */
  structureModels: StructureModelResource[][];
}

export type SpecificationSourceLoader = (
  dataSpecificationIri: string
) => Promise<SpecificationSource>;
