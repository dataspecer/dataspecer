import { Entity, EntityModel } from "../entity-model/index.ts";
import { isSemanticModelClass, isSemanticModelRelationship, SemanticModelClass, SemanticModelEntity, SemanticModelRelationship } from "../semantic-model/concepts/index.ts";
import { InMemorySemanticModel } from "../semantic-model/in-memory/index.ts";
import { ExternalEntityWrapped, LocalEntityWrapped, SemanticModelAggregator } from "./interfaces.ts";
import { getSearchRelevance } from "./utils/get-search-relevance.ts";
import { withAbsoluteIri } from "../semantic-model/utils/index.ts";
import { createDefaultNoProfileAggregator, NoProfileAggregator } from "./utils/no-profile-aggregator.ts";
import { AggregatedProfiledSemanticModelRelationship } from "../semantic-model/profile/aggregator/aggregator.ts";

const VOCABULARY_AGGREGATOR_TYPE = "vocabulary-aggregator";

/**
 * Result of the aggregation from VocabularyAggregator.
 */
export interface AggregatedEntityInVocabularyAggregator<T extends SemanticModelEntity = SemanticModelEntity> extends LocalEntityWrapped<T> {
  type: typeof VOCABULARY_AGGREGATOR_TYPE;
}

export class VocabularyAggregator implements SemanticModelAggregator {
  private readonly vocabulary: InMemorySemanticModel | EntityModel;
  private readonly entities: Record<string, AggregatedEntityInVocabularyAggregator> = {};
  private readonly subscribers: Set<(updated: Record<string, AggregatedEntityInVocabularyAggregator>, removed: string[]) => void> = new Set();
  thisVocabularyChain: object;
  protected readonly baseIri?: string;
  private readonly noProfileAggregator: NoProfileAggregator;

  constructor(vocabulary: InMemorySemanticModel | EntityModel) {
    this.vocabulary = vocabulary;
    this.baseIri = (vocabulary as Partial<InMemorySemanticModel>).getBaseIri?.();
    this.noProfileAggregator = createDefaultNoProfileAggregator();

    this.thisVocabularyChain = {
      name: this.vocabulary.getAlias() ?? "Vocabulary",
    };

    this.updateLocalEntities(this.vocabulary.getEntities(), []);
    this.vocabulary.subscribeToChanges((updated, removed) => {
      this.updateLocalEntities(updated, removed);
    });
  }

  /**
   * When entities from this model (profile) change this function is called.
   */
  private updateLocalEntities(updated: Record<string, Entity>, removed: string[]) {
    const toUpdate: Record<string, AggregatedEntityInVocabularyAggregator> = {};
    for (const entity of Object.values(updated)) {
      let aggregatedEntity = withAbsoluteIri(entity as SemanticModelEntity, this.baseIri);
      if (isSemanticModelClass(aggregatedEntity)) {
        aggregatedEntity = this.noProfileAggregator.aggregateSemanticModelClass(aggregatedEntity);
      } else if (isSemanticModelRelationship(aggregatedEntity)) {
        // todo fix types
        aggregatedEntity = this.noProfileAggregator.aggregateSemanticModelRelationship(aggregatedEntity) as AggregatedProfiledSemanticModelRelationship & {iri: string};
      }

      const update = {
        id: entity.id,
        type: VOCABULARY_AGGREGATOR_TYPE,
        aggregatedEntity: aggregatedEntity,
        vocabularyChain: [this.thisVocabularyChain],
        // rawEntity,
        // sources: [],
      } satisfies AggregatedEntityInVocabularyAggregator;
      this.entities[entity.id] = update;
      toUpdate[entity.id] = update;
    }

    for (const toRemove of removed) {
      delete this.entities[toRemove];
    }

    this.notifySubscribers(toUpdate, removed);
  }

  /**
   * Notifies all subscribers about the change that is already in entities.
   */
  private notifySubscribers(changed: typeof this.entities, removed: (keyof typeof this.entities)[]) {
    this.subscribers.forEach(subscriber => subscriber(changed, removed));
  }

  /**
   * Searches in the profile and all sources, if it is allowed.
   * For local search it provides two options:
   *  - use directly the entity
   *  - create a new profile of such entity
   * For external search it provides only one option:
   *  - create a new entity profile in this AP
   */
  async search(searchQuery: string): Promise<ExternalEntityWrapped[]> {
    const query = new RegExp(searchQuery, 'i');
    const results: ExternalEntityWrapped[] = [];

    const entities = Object.values(this.entities);
    const classes = entities.filter(entity => isSemanticModelClass(entity.aggregatedEntity)) as AggregatedEntityInVocabularyAggregator<SemanticModelClass>[];
    const localResults = classes.map(cls => ([cls, getSearchRelevance(query, cls.aggregatedEntity)]) as [AggregatedEntityInVocabularyAggregator<SemanticModelClass>, number | false])
      .filter((([_, relevance]) => relevance !== false) as (result: [AggregatedEntityInVocabularyAggregator<SemanticModelClass>, number | false]) => result is [AggregatedEntityInVocabularyAggregator<SemanticModelClass>, number])
      .sort(([_, a], [__, b]) => a - b);

    for (const [cls] of localResults) {
      results.push({
        aggregatedEntity: cls.aggregatedEntity,
        vocabularyChain: [this.thisVocabularyChain],
        originatingModel: [this],
      });
    }

    return results;
  }

  async externalEntityToLocalForSearch(entity: ExternalEntityWrapped) {
    return this.entities[entity.aggregatedEntity.id]!;
  }

  execOperation(operation: any) {
    (this.vocabulary as InMemorySemanticModel).executeOperation(operation);
  }

  /**
   * We treat profiled entities as not part of this entity surroundings so we only return the direct entities.
   */
  async getSurroundings(localOrExternalEntityId: string): Promise<ExternalEntityWrapped[]> {
    return Object.values(this.entities).map(entity => ({
      aggregatedEntity: entity.aggregatedEntity,
      vocabularyChain: [this.thisVocabularyChain],
      originatingModel: [this],
    }));
  }

  /**
   * Get hierarchy should only work for local entities as there is no reason to get hierarchy of external entities as they should not be accessible.
   */
  getHierarchy(localEntityId: string): Promise<ExternalEntityWrapped[] | null> {
    return this.getSurroundings(localEntityId);
  }

  /**
   * Shows full hierarchy of given local entity only for use with getSurroundings.
   */
  async getHierarchyForLookup(localEntityId: string): Promise<ExternalEntityWrapped[] | null> {
    return this.getHierarchy(localEntityId);
  }

  getLocalEntity(id: string): AggregatedEntityInVocabularyAggregator | null {
    return this.entities[id] ?? null;
  }

  subscribeToChanges(callback: (updated: Record<string, AggregatedEntityInVocabularyAggregator>, removed: string[]) => void) {
    this.subscribers.add(callback);
  }

  getAggregatedEntities(): Record<string, AggregatedEntityInVocabularyAggregator> {
    return this.entities;
  }

  async externalEntityToLocalForHierarchyExtension(fromEntity: string, entity: ExternalEntityWrapped<SemanticModelClass>, isEntityMoreGeneral: boolean, sourceSemanticModel: ExternalEntityWrapped[]): Promise<AggregatedEntityInVocabularyAggregator> {
    return this.entities[entity.aggregatedEntity.id]!;
  }

  async externalEntityToLocalForSurroundings(fromEntity: string, entity: ExternalEntityWrapped<SemanticModelRelationship>, direction: boolean, sourceSemanticModel: ExternalEntityWrapped[]): Promise<AggregatedEntityInVocabularyAggregator> {
    return this.entities[entity.aggregatedEntity.id]!;
  }
}