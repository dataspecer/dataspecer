import { EntityModel, EntityModelChangeListener } from "./entity-model.ts";
import { Entity, EntityRecord } from "./model/index.ts";

/**
 * Provide ability to see several models using one interface.
 * This is easy until there is an identifier collision.
 */
export interface AggregatedEntityModel extends EntityModel {

  addModels(models: EntityModel[]): void;

  removeModels(models: EntityModel[]): void;

  /**
   * Return all models with data about given entity.
   */
  sources(entity: Entity): EntityModel[];

}

export interface EntityConflictResolutionPolicy {

  resolve(entities: Entity[]): Entity;

}

class DefaultAggregatedEntityModel implements AggregatedEntityModel {

  readonly identifier: string;

  readonly conflictResolutionPolicy: EntityConflictResolutionPolicy;

  /**
   * Aggregated models' containers.
   */
  readonly models: Map<EntityModel, EntityModelContainer> = new Map();

  /**
   * Aggregated entities from all models.
   */
  readonly entities: EntityRecord = {};

  /**
   * For each entity store all models this entity is in.
   */
  readonly entitySources: Record<string, EntityModel[]> = {};

  /**
   * Registered change listeners.
   */
  readonly listeners: Set<EntityModelChangeListener> = new Set();

  constructor(
    identifier: string,
    conflictResolutionPolicy: EntityConflictResolutionPolicy,
  ) {
    this.identifier = identifier;
    this.conflictResolutionPolicy = conflictResolutionPolicy;
  }

  getId(): string {
    return this.identifier;
  }

  getEntities(): EntityRecord {
    return this.entities;
  }

  subscribeToChanges(listener: EntityModelChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addModels(models: EntityModel[]): void {
    for (const model of models) {
      if (this.models.has(model)) {
        continue;
      }
      // Register to changes and create a container.
      const container: EntityModelContainer = {
        model,
        unsubscribe: model.subscribeToChanges(
          (updated, removed) =>
            this.onModelHasChanged(container, updated, removed)),
      };
      this.models.set(model, container);
      // Add all entities from the model, the lazy way.
      this.onModelHasChanged(
        container, container.model.getEntities(), []);
    }
  }

  /**
   * Aggregate and propagate changes.
   */
  private onModelHasChanged(
    container: EntityModelContainer,
    updated: Record<string, Entity>,
    removed: string[],
  ) {
    // Remove.
    this.removeModelFromSources(removed, container.model);
    const finalRemoved = this.collectWithNoSources();
    this.removeFromSources(finalRemoved);
    // Update existing entities.
    const finalUpdated: Record<string, Entity> = {};

    // TODO Update entities !

    // Call listeners.
    this.listeners.forEach(listener => listener(finalUpdated, finalRemoved));
  }

  private removeModelFromSources(entities: string[], model: EntityModel): void {
    for (const entity of entities) {
      const models = this.entitySources[entity];
      if (model === undefined) {
        continue;
      }
      removeItemInPlace(models, model);
    }
  }

  /**
   * @returns Identifiers of all entities without a source.
   */
  private collectWithNoSources(): string[] {
    return Object.entries(this.sources)
      .filter(([value]) => value.length === 0)
      .map(([_, key]) => key);
  }

  private removeFromSources(entities: string[]): void {
    for (const entity of entities) {
      delete this.entitySources[entity];
    }
  }

  removeModels(models: EntityModel[]): void {
    for (const model of models) {
      const container = this.models.get(model);
      if (container === undefined) {
        continue;
      }
      // Unsubscribe and remove container.
      this.models.delete(model);
      container.unsubscribe();
      // Remove all entities from the model, the lazy way.
      this.onModelHasChanged(
        container, {}, Object.keys(container.model.getEntities()));
    }
  }

  sources(entity: Entity): EntityModel[] {
    return this.entitySources[entity.id];
  }

}

function removeItemInPlace<T>(array: T[], item: T): void {
  const index = array.indexOf(item);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

interface EntityModelContainer {

  readonly model: EntityModel;

  readonly unsubscribe: () => void;

}

export function createAggregatedEntityModel(
  identifier: string,
  conflictResolutionPolicy: EntityConflictResolutionPolicy,
): AggregatedEntityModel {
  return new DefaultAggregatedEntityModel(identifier, conflictResolutionPolicy);
}
