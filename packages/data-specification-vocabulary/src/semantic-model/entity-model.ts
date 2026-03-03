import { Entity } from "@dataspecer/core-v2/entity-model";

/**
 * A wrapper for list of entities.
 */
export interface EntityListContainer {

  /**
   * Base IRI for all relative IRIs in {@link entities}
   * or null if there is no common baseIRI available.
   */
  baseIri: string | null;

  /**
   * List of all entities.
   */
  entities: Entity[],

}
