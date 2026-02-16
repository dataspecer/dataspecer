import { Entity } from "../entity-model/index.ts";
import { SemanticModelClass, SemanticModelRelationship, type SemanticModelEntity } from "../semantic-model/concepts/index.ts";
import { SemanticEntityIdMerger, StrongerWinsSemanticEntityIdMerger } from "../semantic-model/merge/merger/index.ts";
import { ExternalEntityWrapped, LocalEntityWrapped, SemanticModelAggregator } from "./interfaces.ts";
import { TupleSet } from "./utils/tuple-set.ts";

type MergeAggregatorExternalEntityData = {
  parentModel: SemanticModelAggregator;
originalEntity?: ExternalEntityWrapped;
}

/**
 * Merges multiple semantic model aggregators into one.
 * It has some limitations such as it cannot resolve external hierarchy queries across multiple models.
 * todo: it should be possible to implement heuristics for this if we knew which model is external and which is not.
 */
export class MergeAggregator implements SemanticModelAggregator {
  private readonly models: SemanticModelAggregator[];

  /**
   * Aggregated entities by this model - the final result.
   */
  private readonly entities: Record<string, LocalEntityWrapped> = {};
  private readonly entityToModel: TupleSet<string, SemanticModelAggregator> = new TupleSet();
  private readonly entitiesInModels: Map<SemanticModelAggregator, Record<string, LocalEntityWrapped>> = new Map();

  private readonly subscribers: Set<(updated: Record<string, LocalEntityWrapped>, removed: string[]) => void> = new Set();

  private readonly semanticEntityIdMerger: SemanticEntityIdMerger = new StrongerWinsSemanticEntityIdMerger();

  constructor(models: SemanticModelAggregator[]) {
    this.models = models;

    this.models.forEach(model => {
      this.entitiesInModels.set(model, {});
      this.update(model, model.getAggregatedEntities(), []);
      model.subscribeToChanges((updated, removed) => {
        this.update(model, updated, removed);
      });
    });
  }

  async externalEntityToLocalForSurroundings(fromEntity: string, entity: ExternalEntityWrapped<SemanticModelRelationship>, direction: boolean, sourceSemanticModel: ExternalEntityWrapped[]): Promise<LocalEntityWrapped> {
    const [unwrappedEntity, data] = this.unwrapExternalEntity(entity);
    const unwrappedSourceSemanticModel = sourceSemanticModel.map(entity => this.unwrapExternalEntity(entity)[0]);
    const result = await data.parentModel.externalEntityToLocalForSurroundings(fromEntity, unwrappedEntity, direction, unwrappedSourceSemanticModel);
    return this.entities[result.aggregatedEntity.id]!;
  }

  async externalEntityToLocalForHierarchyExtension(fromEntity: string, entity: ExternalEntityWrapped<SemanticModelClass>, isEntityMoreGeneral: boolean, sourceSemanticModel: ExternalEntityWrapped[]): Promise<LocalEntityWrapped> {
    const [unwrappedEntity, data] = this.unwrapExternalEntity(entity);
    const unwrappedSourceSemanticModel = sourceSemanticModel.map(entity => this.unwrapExternalEntity(entity)[0]);
    const result = await data.parentModel.externalEntityToLocalForHierarchyExtension(fromEntity, unwrappedEntity, isEntityMoreGeneral, unwrappedSourceSemanticModel);
    return this.entities[result.aggregatedEntity.id]!;
  }

  execOperation(operation: any) {
    if (this.models.length > 1) {
      throw new Error('Operation execution is not supported for multiple models');
    }

    this.models[0]!.execOperation(operation);
  }

  /**
   * Called when source model changes - updates local entities.
   */
  private update(model: SemanticModelAggregator, changed: Record<string, LocalEntityWrapped>, removed: string[]) {
    Object.keys(changed).forEach(id => this.entityToModel.add(id, model));
    removed.forEach(id => this.entityToModel.delete(id, model));
    Object.assign(this.entitiesInModels.get(model)!, changed);
    removed.forEach(id => delete this.entitiesInModels.get(model)![id]);

    // Now we can update the final result
    const toProcess = [...Object.keys(changed), ...removed];
    const updated = {} as Record<string, LocalEntityWrapped>;
    const removedFinal = [];
    for (const entity of toProcess) {
      const owningModels = this.entityToModel.getByFirst(entity);
      if (owningModels.length === 0) {
        delete this.entities[entity];
        removedFinal.push(entity);
      } else {
        // todo: We are merging by ID, which is wrong!
        // todo: But right now we are guaranteed that entities fro external models have ID === IRI which effectively makes this correct as we are merging duplicates
        // todo: do clever merging here if multiple models own the same entity

        const allEntities = owningModels.map(model => this.entitiesInModels.get(model)![entity]);

        const result = this.semanticEntityIdMerger.merge(allEntities.map(e => e!.aggregatedEntity as SemanticModelEntity));
        const wrapped = {
          ...allEntities[0],
          aggregatedEntity: result
        } as LocalEntityWrapped;
        this.entities[entity] = wrapped;
        updated[entity] = wrapped;
      }
    }

    this.notifySubscribers(updated, removedFinal);
  }

  /**
   * Notifies all subscribers about the change that is already in entities.
   */
  private notifySubscribers(changed: typeof this.entities, removed: (keyof typeof this.entities)[]) {
    this.subscribers.forEach(subscriber => subscriber(changed, removed));
  }

  async search(searchQuery: string): Promise<ExternalEntityWrapped[]> {
    const finalResults = [];
    for (const model of this.models) {
      const result = await model.search(searchQuery);
            finalResults.push(...result.map(entity => ({
        ...entity,
        originatingModel: [...entity.originatingModel, {
          parentModel: model,
          originalEntity: entity
        } satisfies MergeAggregatorExternalEntityData]
      })));
    }

    return finalResults;
  }

  async externalEntityToLocalForSearch(entity: ExternalEntityWrapped): Promise<LocalEntityWrapped> {
    const [_, data] = this.unwrapExternalEntity(entity);

    const localEntity = await data.parentModel.externalEntityToLocalForSearch(data.originalEntity!);
    return this.entities[localEntity.aggregatedEntity.id]!;
  }

  async getHierarchy(localEntityId: string): Promise<ExternalEntityWrapped[] | null> {
    const finalResults = [];
    for (const model of this.models) {
      const result = await model.getHierarchy(localEntityId);
      if (result) {
        const metadata = {
          parentModel: model
        } satisfies MergeAggregatorExternalEntityData;
        finalResults.push(...result.map(entity => ({
          ...entity,
          originatingModel: [...entity.originatingModel, metadata]
        })));
      }
    }
    return finalResults;
  }

  async getHierarchyForLookup(localEntityId: string): Promise<ExternalEntityWrapped[] | null> {
    const finalResults = [];
    for (const model of this.models) {
      const result = await model.getHierarchyForLookup(localEntityId);
      if (result) {
        const metadata = {
          parentModel: model
        } satisfies MergeAggregatorExternalEntityData;
        finalResults.push(...result.map(entity => ({
          ...entity,
          originatingModel: [...entity.originatingModel, metadata]
        })));
      }
    }
    return finalResults;
  }

  async getSurroundings(localOrExternalEntityId: string): Promise<ExternalEntityWrapped[]> {
    const finalResults = [];
    for (const model of this.models) {
      const result = await model.getSurroundings(localOrExternalEntityId);
      if (result) {
        const metadata = {
          parentModel: model
        } satisfies MergeAggregatorExternalEntityData;
        finalResults.push(...result.map(entity => ({
          ...entity,
          originatingModel: [...entity.originatingModel, metadata]
        })));
      }
    }
    return finalResults;
  }

  private unwrapExternalEntity<T extends Entity>(entity: ExternalEntityWrapped<T>): [ExternalEntityWrapped<T>, MergeAggregatorExternalEntityData] {
    const unwrappedEntity = {
      ...entity,
      originatingModel: [...entity.originatingModel].splice(-1)
    };

    const data = entity.originatingModel[entity.originatingModel.length - 1] as MergeAggregatorExternalEntityData;

    return [unwrappedEntity, data];
  }

  getLocalEntity(id: string): LocalEntityWrapped | null {
    return this.entities[id] ?? null;
  }

  subscribeToChanges(callback: (updated: Record<string, LocalEntityWrapped>, removed: string[]) => void) {
    this.subscribers.add(callback);
  }

  getAggregatedEntities(): Record<string, LocalEntityWrapped> {
    return this.entities;
  }
}