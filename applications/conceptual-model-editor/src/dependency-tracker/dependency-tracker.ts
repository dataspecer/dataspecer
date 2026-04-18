import {
  Entity, EntityIdentifier, ModelIdentifier,
} from "@dataspecer/entity-model";
import { ModelObserver } from "./model-observer";

/**
 * Allow sourcing {@link Tracker} with events from {@link ModelObserver}.
 */
export function createDependencyTracker(trackers: Tracker[]) : ModelObserver {
  return new DependencyTracker(trackers);
}

class DependencyTracker implements ModelObserver {

  /**
   * Map of raw entities.
   * We use this to provide diff for an update.
   */
  readonly entityMap: Map<EntityIdentifier, Entity>;

  /**
   * Keep list of dependencies for entities.
   */
  readonly dependencies: Map<EntityIdentifier, Set<EntityIdentifier>>;

  /**
   * List all entities that need to recompute if given entity change.
   * This is derived from {@link dependencies}.
   */
  readonly recomputeOnChange: Map<EntityIdentifier, Set<EntityIdentifier>>;

  /**
   * Registered trackers.
   */
  readonly trackers: Tracker[];

  constructor(trackers: Tracker[]) {
    this.entityMap = new Map();
    this.dependencies = new Map();
    this.recomputeOnChange = new Map();
    this.trackers = trackers;
  }

  onEntitiesDidChange(event: {
    [model: ModelIdentifier]: {
      created: Entity[],
      updated: Entity[],
      deleted: EntityIdentifier[],
    }
  }) {
    this.trackers.forEach(tracker => tracker.onWillUpdate?.());
    // Process changes one model at a time.
    const changed: EntityIdentifier[] = [];
    for (const [model, { created, updated, deleted }] of Object.entries(event)) {
      for (const entity of created) {
        this.createEntity(model, entity);
        changed.push(entity.id);
      }
      for (const entity of updated) {
        const previous = this.entityMap.get(entity.id);
        // If there is no previous record we handle is as create.
        if (previous === undefined) {
          this.createEntity(model, entity);
        } else {
          this.updateEntity(model, previous, entity);
        }
        changed.push(entity.id);
      }
      for (const identifier of deleted) {
        const previous = this.entityMap.get(identifier);
        if (previous === undefined) {
          // There is no previous record, we can ignore this.
          continue;
        }
        this.deleteEntity(model, previous);
        changed.push(previous.id);
      }
    }
    // Now we need to propagate changes to dependencies.
    this.propagateChanges(changed);
    //
    this.trackers.forEach(tracker => tracker.onDidUpdate?.());
  }

  createEntity(model: ModelIdentifier, next: Entity): void {
    const nextDependencies = new Set<EntityIdentifier>();
    for (const tracker of this.trackers) {
      tracker.dependencies?.(next).forEach(id => nextDependencies.add(id));
      tracker.onEntityDidCreate?.(model, next);
    }
    this.dependencies.set(next.id, nextDependencies);
    this.addToRecomputeOnChange(next.id, nextDependencies);
    this.entityMap.set(next.id, next);
  }

  /**
   * Add given entity identifier to {@link recomputeOnChange} of it's
   * dependencies.
   */
  addToRecomputeOnChange(
    identifier: EntityIdentifier,
    dependencies: EntityIdentifier[] | Set<EntityIdentifier>,
  ) {
    for (const dependency of dependencies) {
      const values = this.recomputeOnChange.get(dependency);
      if (values === undefined) {
        this.recomputeOnChange.set(dependency, new Set([identifier]));
      } else {
        values.add(identifier);
      }
    }
  }

  updateEntity(model: ModelIdentifier, previous: Entity, next: Entity): void {
    const nextDependencies = new Set<EntityIdentifier>();
    for (const tracker of this.trackers) {
      tracker.dependencies?.(next).forEach(id => nextDependencies.add(id));
      tracker.onEntityDidChange?.(model, previous, next);
    }
    // Update dependencies.
    const previousDependencies = this.dependencies.get(previous.id) ?? new Set();
    const removed = previousDependencies.difference(nextDependencies);
    this.removeFromRecomputeOnChange(next.id, removed);
    const created = nextDependencies.difference(previousDependencies);
    this.addToRecomputeOnChange(next.id, created);
    this.dependencies.set(next.id, nextDependencies);
    this.entityMap.set(next.id, next);
  }

  /**
   * Remove given entity identifier from {@link recomputeOnChange} of it's
   * dependencies.
   */
  removeFromRecomputeOnChange(
    identifier: EntityIdentifier,
    dependencies: EntityIdentifier[] | Set<EntityIdentifier>,
  ) {
    for (const dependency of dependencies) {
      const values = this.recomputeOnChange.get(dependency);
      if (values === undefined) {
        // We have nothing to remove.
        continue;
      } else {
        values.delete(identifier);
      }
    }
  }

  deleteEntity(model: ModelIdentifier, previous: Entity): void {
    for (const tracker of this.trackers) {
      tracker.onEntityDidRemove?.(model, previous);
    }
    const identifier = previous.id;
    const entityDependencies = this.dependencies.get(identifier);
    if (entityDependencies !== undefined) {
      this.removeFromRecomputeOnChange(identifier, entityDependencies);
    }
    // Remove from internal structures.
    this.entityMap.delete(identifier);
    this.dependencies.delete(identifier);
  }

  propagateChanges(changed: EntityIdentifier[]): void {
    const visited = new Set<EntityIdentifier>();
    // Prepare initial queue from changes.
    let queue = new Set<EntityIdentifier>();
    for (const identifier of changed) {
      const toRecompute = this.recomputeOnChange.get(identifier);
      if (toRecompute !== undefined) {
        toRecompute.forEach(id => queue.add(id));
      }
    }
    // We do updates in iterations.
    // In each iteration we update entities whose dependencies are not pending.
    // Others are postponed to the next iteration.
    // Newly discovered dependents are also added to the next iteration.
    while (queue.size > 0) {
      const nextQueue = new Set<EntityIdentifier>();
      let doNextIteration = false;
      for (const identifier of queue) {
        // Do not revisit already updated entity.
        if (visited.has(identifier)) {
          continue;
        }
        // We can continue only if none of the dependencies is pending.
        const dependencies = this.dependencies.get(identifier);
        if (dependencies !== undefined) {
          const pending = dependencies.values().some(item => queue.has(item));
          if (pending) {
            nextQueue.add(identifier);
            continue;
          }
        }
        // We update the entity.
        doNextIteration = true;
        visited.add(identifier);
        // Get the entity or skip if it is missing.
        const entity = this.entityMap.get(identifier);
        if (entity !== undefined) {
          // Propagate changes.
          for (const tracker of this.trackers) {
            tracker.onDependencyDidChange?.(entity);
          }
        }
        // Queue dependents for the next iteration.
        const toRecompute = this.recomputeOnChange.get(identifier);
        if (toRecompute !== undefined) {
          toRecompute.forEach(id => {
            if (!visited.has(id)) {
              nextQueue.add(id);
            }
          });
        }
      }
      // No progress means unresolvable cycle — terminate to avoid infinite loop.
      if (!doNextIteration) {
        console.error(
          "DependencyTracker was unable to resolve all queued items.",
          { queue: [...queue] });
        break;
      }
      queue = nextQueue;
    }
  }
}

/**
 * Higher level interface to track entity changes.
 */
export interface Tracker {

  /**
   * @returns Dependencies of the given entity, can contain duplicities.
   */
  dependencies?: (entity: Entity) => string[];

  /**
   * Called on start of an change event handling.
   */
  onWillUpdate?: () => void;

  /**
   * Called once all changes from a change event have been processed.
   */
  onDidUpdate?: () => void;

  /**
   * Called when the entity was created.
   */
  onEntityDidCreate?: (
    model: ModelIdentifier, next: Entity) => void;

  /**
   * Called when the entity was changed.
   */
  onEntityDidChange?: (
    model: ModelIdentifier, previous: Entity, next: Entity) => void;

  /**
   * Called when the entity was removed.
   */
  onEntityDidRemove?: (
    model: ModelIdentifier, previous: Entity) => void;

  /**
   * Call when an entity's dependency has changed.
   * Argument is the last version of the entity not the dependency.
   */
  onDependencyDidChange?: (next: Entity) => void;

}
