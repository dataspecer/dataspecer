import { Entity } from "../entity-model/index.ts";
import { isSemanticModelClass, SemanticModelClass, SemanticModelEntity, SemanticModelRelationship } from "../semantic-model/concepts/index.ts";
import { InMemorySemanticModel } from "../semantic-model/in-memory/index.ts";
import { createClass, CreatedEntityOperationResult, createRelationship } from "../semantic-model/operations/index.ts";
import { copyInheritanceToModel } from "./utils/copy-inheritance-to-model.ts";
import { ExternalEntityWrapped, SemanticModelAggregator, LocalEntityWrapped } from "./interfaces.ts";
import { generateModelColor } from "./utils/color-utils.ts";

const EXTERNAL_MODEL_WITH_CACHE_AGGREGATOR_TYPE = "external-model-with-cache-aggregator";

export interface SourceSemanticModelInterface {
  search(searchQuery: string): Promise<SemanticModelClass[]>;
  getSurroundings(iri: string): Promise<SemanticModelEntity[]>;
  getFullHierarchy(iri: string): Promise<SemanticModelEntity[]>;
}

/**
 * Aggregates external semantic model with its cache.
 */
export class ExternalModelWithCacheAggregator implements SemanticModelAggregator {
  /**
   * Regular semantic model that is used as a cache for the external model that
   * must be queried.
   */
  private readonly cacheSemanticModel: InMemorySemanticModel;

  /**
   * External semantic model that must be queried to obtain data.
   */
  private readonly externalSemanticModel: SourceSemanticModelInterface;

  private readonly aggregatedEntities: Record<string, LocalEntityWrapped> = {};
  private readonly subscribers: Set<(updated: Record<string, LocalEntityWrapped>, removed: string[]) => void> = new Set();

  readonly thisVocabularyChain: object;

  constructor(cacheSemanticModel: InMemorySemanticModel, externalSemanticModel: SourceSemanticModelInterface) {
    this.cacheSemanticModel = cacheSemanticModel;
    this.externalSemanticModel = externalSemanticModel;

    this.updateEntities(this.cacheSemanticModel.getEntities(), []);
    this.cacheSemanticModel.subscribeToChanges((updated, removed) => {
      this.updateEntities(updated, removed);
    });

    this.thisVocabularyChain = {
      name: this.cacheSemanticModel.getAlias() ?? "Vocabulary",
      color: generateModelColor(this.cacheSemanticModel.getId()),
    };
  }

  /**
   * Helper function to trigger update of entities
   */
  private updateEntities(updated: Record<string, Entity>, removed: string[]) {
    const toChanged: Record<string, LocalEntityWrapped> = {};
    const toRemoved: string[] = [];

    for (const entity of Object.values(updated)) {
      const update = {
        id: entity.id,
        type: EXTERNAL_MODEL_WITH_CACHE_AGGREGATOR_TYPE,
        aggregatedEntity: entity as SemanticModelEntity,
        vocabularyChain: [this.thisVocabularyChain],
      } satisfies LocalEntityWrapped;
      this.aggregatedEntities[entity.id] = update;
      toChanged[entity.id] = update;
    }

    for (const id of removed) {
      delete this.aggregatedEntities[id];
      toRemoved.push(id);
    }

    this.subscribers.forEach((subscriber) => subscriber(toChanged, toRemoved));
  }

  async search(searchQuery: string): Promise<ExternalEntityWrapped[]> {
    const result = this.transformEntities(await this.externalSemanticModel.search(searchQuery));
    return result;
  }

  async externalEntityToLocalForSearch(entity: ExternalEntityWrapped): Promise<LocalEntityWrapped> {
    // We need to create a class if not exists
    const cls = entity.aggregatedEntity as SemanticModelClass;
    const iri = cls.iri;

    let foundEntity = Object.values(this.cacheSemanticModel.getEntities()).find((entity) => isSemanticModelClass(entity) && entity.iri === iri) as SemanticModelClass | undefined;
    if (!foundEntity) {
      const op = createClass(cls);
      const { id } = this.cacheSemanticModel.executeOperation(op) as CreatedEntityOperationResult;
      foundEntity = this.cacheSemanticModel.getEntities()[id] as SemanticModelClass;
    }

    return this.aggregatedEntities[foundEntity.id]!;
  }

  async getHierarchy(localEntityId: string): Promise<ExternalEntityWrapped[]> {
    const pim = this.aggregatedEntities[localEntityId] as LocalEntityWrapped<SemanticModelClass>;
    if (!pim) {
      throw new Error(`getHierarchy work for local entities only.` + localEntityId);
    }
    const entities = await this.externalSemanticModel.getFullHierarchy(pim.aggregatedEntity.iri!);
    return this.transformEntities(entities);
  }

  getHierarchyForLookup(localEntityId: string): Promise<ExternalEntityWrapped[] | null> {
    return this.getHierarchy(localEntityId);
  }

  async getSurroundings(localOrExternalEntityId: string): Promise<ExternalEntityWrapped[]> {
    const maybePim = this.aggregatedEntities[localOrExternalEntityId];
    if (maybePim) {
      const entities = await this.externalSemanticModel.getSurroundings((maybePim.aggregatedEntity as SemanticModelClass).iri!);
      return this.transformEntities(entities);
    } else {
      const entities = await this.externalSemanticModel.getSurroundings(localOrExternalEntityId);
      return this.transformEntities(entities);
    }
  }

  /**
   * Somehow creates an entity from
   * true means that the [0] end should be extended by hierarchy
   */
  async externalEntityToLocalForSurroundings(
    fromEntity: string,
    entity: ExternalEntityWrapped<SemanticModelRelationship>,
    direction: boolean,
    sourceSemanticModel: ExternalEntityWrapped[]
  ): Promise<LocalEntityWrapped> {
    const sourceModel = sourceSemanticModel.map((e) => e.aggregatedEntity);

    // Create path from the entity to the first end
    await copyInheritanceToModel(this.cacheSemanticModel, sourceModel, fromEntity, entity.aggregatedEntity.ends[direction ? 0 : 1]!.concept!);

    // Create the other end
    const conceptId = entity.aggregatedEntity.ends[direction ? 1 : 0]!.concept;
    const concept = conceptId ? sourceModel.find((e) => e.id === conceptId) : null;
    if (concept && !this.cacheSemanticModel.getEntities()[conceptId!]) {
      const op = createClass(concept);
      this.cacheSemanticModel.executeOperation(op);
    }

    // Create the relationship
    if (!this.cacheSemanticModel.getEntities()[entity.aggregatedEntity.id]) {
      const op = createRelationship(entity.aggregatedEntity);
      this.cacheSemanticModel.executeOperation(op);
    }

    return this.aggregatedEntities[entity.aggregatedEntity.id]!;
  }

  async execOperation(operation: any) {
    return this.cacheSemanticModel.executeOperation(operation);
  }

  private transformEntities(entities: SemanticModelEntity[]): ExternalEntityWrapped[] {
    return entities.map((entity) => ({
      aggregatedEntity: entity,
      vocabularyChain: [this.thisVocabularyChain],
      originatingModel: [],
    }));
  }

  async externalEntityToLocalForHierarchyExtension(
    fromEntity: string,
    entity: ExternalEntityWrapped<SemanticModelClass>,
    isEntityMoreGeneral: boolean,
    sourceSemanticModel: ExternalEntityWrapped[],
  ): Promise<LocalEntityWrapped> {
    const sourceModel = sourceSemanticModel.map((e) => e.aggregatedEntity);
    if (isEntityMoreGeneral) {
      await copyInheritanceToModel(this.cacheSemanticModel, sourceModel, fromEntity, entity.aggregatedEntity.id);
    } else {
      await copyInheritanceToModel(this.cacheSemanticModel, sourceModel, entity.aggregatedEntity.id, fromEntity);
    }
    return this.aggregatedEntities[entity.aggregatedEntity.id]!;
  }

  getLocalEntity(id: string): LocalEntityWrapped | null {
    return this.aggregatedEntities[id] ?? null;
  }

  getAggregatedEntities(): Record<string, LocalEntityWrapped> {
    return this.aggregatedEntities;
  }

  subscribeToChanges(callback: (updated: Record<string, LocalEntityWrapped>, removed: string[]) => void) {
    this.subscribers.add(callback);
  }
}
