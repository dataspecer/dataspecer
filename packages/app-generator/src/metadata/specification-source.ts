import type { CoreResource } from '@dataspecer/core/core';
import type { Entity } from '@dataspecer/core-v2/entity-model';

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
  aggregatedSemanticModel: Entity[];
  /**
   * Array of structure models. Each structure model is an array of resources containing one
   * DataPsmSchema that is the root of the structure model.
   */
  structureModels: StructureModelResource[][];
}

export type SpecificationSourceLoader = (
  dataSpecificationIri: string
) => Promise<SpecificationSource>;
