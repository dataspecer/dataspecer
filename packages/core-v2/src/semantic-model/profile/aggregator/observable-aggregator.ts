import { Entity } from "@dataspecer/core/entity-model";
import { ModelIdentifier } from "@dataspecer/core/model";
import { EntityIdentifier } from "../../../entity-model/entity.ts";
import {
  isSemanticModelClass, isSemanticModelGeneralization,
  isSemanticModelRelationship, SemanticModelClass, SemanticModelRelationship,
  type SemanticModelEntity,
} from "../../concepts/index.ts";
import {
  StrongerWinsSemanticEntityIdMerger,
} from "../../merge/merger/index.ts";
import {
  isSemanticModelClassProfile,
  isSemanticModelGeneralizationProfile,
  isSemanticModelRelationshipProfile,
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "../concepts/index.ts";
import {
  AggregatedProfiledSemanticModelClass,
  AggregatedProfiledSemanticModelRelationship,
} from "./aggregator-concepts.ts";
import {
  SemanticClassProfileAggregator,
} from "./semantic-class-profile-aggregator.ts";
import {
  SemanticRelationshipProfileAggregator,
} from "./semantic-relationship-profile-aggregator.ts"
import {
  SemanticGeneralizationProfileAggregator
} from "./semantic-generalization-profile-aggregator.ts"

export function createObservableSemanticProfileAggregator()
  : ObservableSemanticProfileAggregator {
  return new DefaultObservableSemanticProfileAggregator();
}

export interface ObservableSemanticProfileAggregator {

  onEntityDidChange(entityChaneEvent: EntityChangeEvent): void;

  subscribeToEntityChanges(listener: Listener): () => void

}

/**
 * Copy of the interface as it is not available from this package.
 */
interface EntityChangeEvent {

  entityChanges: { [model: ModelIdentifier]: EntityChange[] };

}

interface EntityChange {

  previous: Entity | null;

  next: Entity | null;

}

type Listener = (entityChaneEvent: EntityChangeEvent) => void;

/**
 * Entity together with the identifier of the model it currently lives in,
 * or should be attributed to on output.
 */
interface EntityInModel {

  model: ModelIdentifier;

  entity: Entity;

}

class DefaultObservableSemanticProfileAggregator
  implements ObservableSemanticProfileAggregator {

  /**
   * Raw entities as reported by each model.
   * We use this to construct {@link entityCache}.
   */
  private readonly entityCachePerModel:
    Map<ModelIdentifier, Record<EntityIdentifier, Entity>> = new Map();

  /**
   * Entities merged across models by identifier.
   * This is where we read entities from.
   */
  private entityCache: Record<EntityIdentifier, EntityInModel> = {};

  /**
   * Reverse dependency index, i.e. for a given entity identifier the list
   * of identifiers of entities that depend on it.
   */
  private entityDependencies: Record<EntityIdentifier, EntityIdentifier[]> = {};

  /**
   * Last computed aggregated entity for a given identifier.
   */
  private aggregatedCache: Record<EntityIdentifier, EntityInModel> = {};

  private readonly mergeSelector = new StrongerWinsSemanticEntityIdMerger();

  private readonly subscribers = new Set<Listener>();

  onEntityDidChange(event: EntityChangeEvent): void {
    const affected = this.storeEntitiesFromEvent(event);
    // Check if there has been any relevant change.
    if (affected.size === 0) {
      return;
    }

    // With entities stored, we update dependency cache.
    // For now, we just do a full rebuild, we can optimize later.
    this.rebuildDependencyCache();

    // So far, it was about storing and updating internal state.
    // But we need to update and report the changes.
    // Before we start, we prepare a variable to storage changes in.
    const changes: Record<ModelIdentifier, EntityChange[]> = {};
    const queue: EntityIdentifier[] = [...affected];
    const processed = new Set<EntityIdentifier>();

    // Now the processing, one entity at a time.
    // We already know that we are about to process only relevant entities.
    let id: EntityIdentifier | undefined;
    while ((id = queue.shift()) !== undefined) {
      if (processed.has(id)) {
        continue;
      }
      processed.add(id);

      // We get the previously computed state and the cached raw state.
      const previous = this.aggregatedCache[id] ?? null;
      const cached = this.entityCache[id];

      if (cached === undefined) {
        // Entity has been removed!
        delete this.aggregatedCache[id];
        // As have not checked type, it is possible that there is no previous.
        if (previous !== null) {
          this.addChange(changes, previous.model, previous.entity, null);
        }
      } else {
        // We compute and store new state.
        const next = this.computeAggregate(cached.entity, cached.model);
        this.aggregatedCache[id] = next;
        this.addChange(changes, next.model, previous?.entity, next.entity);
      }

      // Add all derived entities for processing.
      queue.push(...this.entityDependencies[id] ?? []);
    }

    // If there is no change we do not notify.
    if (Object.keys(changes).length === 0) {
      return;
    } else {
      const nextEvent = { entityChanges: changes };
      this.subscribers.forEach(subscriber => subscriber(nextEvent));
    }
  }

  /**
   * Store relevant entities from an event into internal state.
   * @returns Identifiers of changed entities.
   */
  private storeEntitiesFromEvent(
    event: EntityChangeEvent,
  ): Set<EntityIdentifier> {
    const result = new Set<EntityIdentifier>();
    for (const [model, changes] of Object.entries(event.entityChanges)) {
      // We start by getting holder for entities from said model.
      let entities = this.entityCachePerModel.get(model);
      if (entities === undefined) {
        entities = {};
        this.entityCachePerModel.set(model, entities);
      }
      // Now we store and update.
      for (const { previous, next } of changes) {
        if (next !== null) {
          // We skip non-relevant entities.
          if (!this.isSemanticEntity(next)) {
            continue;
          }
          // New or created entity.
          entities[next.id] = next;
          this.updateEntityCacheForId(next.id);
          result.add(next.id);
        } else if (previous !== null) {
          // We skip non-relevant entities.
          if (!this.isSemanticEntity(previous)) {
            continue;
          }
          // Entity has been removed.
          delete entities[previous.id];
          this.updateEntityCacheForId(previous.id);
          result.add(previous.id);
        }
      }
    }
    return result;
  }

  /**
   * @returns True when the entity is profile and we need to work with it.
   */
  private isSemanticEntity(entity: Entity) {
    // We are interested to aggregate as well as their dependencies.
    return isSemanticModelClass(entity)
      || isSemanticModelRelationship(entity)
      || isSemanticModelGeneralization(entity)
      || isSemanticModelClassProfile(entity)
      || isSemanticModelRelationshipProfile(entity)
      || isSemanticModelGeneralizationProfile(entity);
  }

  /**
   * Recomputes the merged {@link entityCache} entry for a given identifier.
   * If there are multiple entities with the same identifier select one.
   */
  private updateEntityCacheForId(id: EntityIdentifier): void {
    // Collect entities of given identifier from all models.
    const entries: EntityInModel[] = [];
    for (const [model, entities] of this.entityCachePerModel) {
      const entity = entities[id];
      if (entity !== undefined) {
        entries.push({ entity, model });
      }
    }
    if (entries.length === 0) {
      delete this.entityCache[id];
    } else if (entries.length === 1) {
      this.entityCache[id] = entries[0]!;
    } else {
      // We have entities from multiple models, we need to pick one.
      // But the interface works only on entities, not models.
      // Thus we detect back using index to get the entry to use.
      const entities = entries.map(item => item.entity) as SemanticModelEntity[];
      const selected = this.mergeSelector.merge(entities);
      const index = entries.findIndex(item => item.entity === selected);
      this.entityCache[id] = entries[index]!;
    }
  }

  private rebuildDependencyCache(): void {
    this.entityDependencies = {};
    for (const { entity } of Object.values(this.entityCache)) {
      const dependencies = this.dependencies(entity);
      for (const dependency of dependencies) {
        const dependents = this.entityDependencies[dependency] ?? [];
        dependents.push(entity.id);
        this.entityDependencies[dependency] = dependents;
      }
    }
  }

  /**
   * @returns List of dependencies for given entity.
   */
  private dependencies(entity: Entity): EntityIdentifier[] {
    if (isSemanticModelClassProfile(entity)) {
      return SemanticClassProfileAggregator.dependencies(entity);
    }
    if (isSemanticModelRelationshipProfile(entity)) {
      return SemanticRelationshipProfileAggregator.dependencies(entity);
    }
    if (isSemanticModelGeneralizationProfile(entity)) {
      return SemanticGeneralizationProfileAggregator.dependencies(entity);
    }
    return [];
  }

  /**
   * Add change into the output (first argument) under given model.
   */
  private addChange(
    output: Record<ModelIdentifier, EntityChange[]>,
    model: ModelIdentifier,
    previous: Entity | null | undefined,
    next: Entity | null | undefined,
  ): void {
    // Prepare change object.
    const change = { previous: previous ?? null, next: next ?? null };
    // Store it to the right model.
    const changes = output[model];
    if (changes === undefined) {
      output[model] = [change];
    } else {
      changes.push(change);
    }
  }

  private computeAggregate(
    entity: Entity, model: ModelIdentifier,
  ): EntityInModel {

    // We start by getting all dependencies.
    const dependencies = this.dependencies(entity);

    // Can be a non-profile entity we do not aggregate.
    if (dependencies === null) {
      return { entity, model };
    }

    // Resolve dependencies, try to load from aggregate first.
    const resolvedDependencies = dependencies
      .map(id =>
        this.aggregatedCache[id]?.entity ??
        this.entityCache[id]?.entity ??
        null)
      .filter((item): item is Entity => item !== null);

    // Based on a type we perform the aggregation.

    if (isSemanticModelClassProfile(entity)) {
      return {
        entity: SemanticClassProfileAggregator.aggregate(
          entity,
          resolvedDependencies as (
            SemanticModelClass |
            SemanticModelClassProfile |
            AggregatedProfiledSemanticModelClass
          )[],
        ),
        model,
      };
    } else if (isSemanticModelRelationshipProfile(entity)) {
      return {
        entity: SemanticRelationshipProfileAggregator.aggregate(
          entity,
          resolvedDependencies as (
            SemanticModelRelationship |
            SemanticModelRelationshipProfile |
            AggregatedProfiledSemanticModelRelationship
          )[],
        ),
        model,
      };
    } else if (isSemanticModelGeneralizationProfile(entity)) {
      return {
        entity: SemanticGeneralizationProfileAggregator.aggregate(entity),
        model,
      };
    } else {
      // Something we do not aggregate here.
      return { entity, model };
    }
  }

  subscribeToEntityChanges(
    listener: (entityChaneEvent: EntityChangeEvent) => void,
  ): () => void {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

}
