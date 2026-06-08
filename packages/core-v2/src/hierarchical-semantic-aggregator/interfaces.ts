import { Entity } from "../entity-model/index.ts";
import { SemanticModelClass, SemanticModelRelationship } from "../semantic-model/concepts/index.ts";

/**
 * Wrapped entity that came from the search / adding surrounding entities.
 */
export type ExternalEntityWrapped<T extends Entity = Entity> = {
  aggregatedEntity: T;
  vocabularyChain: object[];

  /**
   * Chain of models the entity comes from.
   */
  originatingModel: object[];

  note?: string;
};

/**
 * Contains the aggregated entity with metadata about aggregation.
 * todo: rename
 */
export type LocalEntityWrapped<T extends Entity = Entity> = {
  /**
   * Id of the entity after the aggregation.
   * Ids must be unique and should not be changed.
   */
  id: string;

  /**
   * Type of the aggregatedEntity.
   */
  type: string;

  /**
   * The result after the aggregation.
   * The type and structure may differ based on the aggregation algorithm.
   */
  aggregatedEntity: T;

  // todo replace
  vocabularyChain: object[];
};

/**
 * Each structure schema has exactly one aggregator of this type. The goal of
 * this aggregator is to hide complex structure of connected models and provide
 * simple API for the editor.
 *
 * External entity to local is a synchronous operation that ensures that the
 * given entity exists.
 */
export interface SemanticModelAggregator {
  search(searchQuery: string): Promise<ExternalEntityWrapped[]>;
  externalEntityToLocalForSearch(entity: ExternalEntityWrapped): LocalEntityWrapped;

  /**
   * Returns the full hierarchy for entity that is local for this model.
   * Returned entities, however, can be from external models.
   * If the entity does not exist in the model, null is returned.
   */
  getHierarchy(localEntityId: string): Promise<ExternalEntityWrapped[] | null>;
  getHierarchyForLookup(localEntityId: string): Promise<ExternalEntityWrapped[] | null>;

  /**
   * Returns the surroundings for either local, or external entity.
   * The returned entities may be from local or external models.
   */
  getSurroundings(localOrExternalEntityId: string): Promise<ExternalEntityWrapped[]>;

  externalEntityToLocalForSurroundings(
    fromEntity: string,
    entity: ExternalEntityWrapped<SemanticModelRelationship>,
    direction: boolean,
    sourceSemanticModel: ExternalEntityWrapped[],
  ): LocalEntityWrapped;
  externalEntityToLocalForHierarchyExtension(
    fromEntity: string,
    entity: ExternalEntityWrapped<SemanticModelClass>,
    isEntityMoreGeneral: boolean,
    sourceSemanticModel: ExternalEntityWrapped[],
  ): LocalEntityWrapped;

  execOperation(operation: any): any;

  getAggregatedEntities(): Record<string, LocalEntityWrapped>;
  subscribeToChanges(callback: (updated: Record<string, LocalEntityWrapped>, removed: string[]) => void): void;

  getLocalEntity(id: string): LocalEntityWrapped | null;
}
