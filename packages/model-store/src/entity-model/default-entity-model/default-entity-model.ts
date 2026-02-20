import type { EntityModel, EntitySet, ObservableEntityModel, ObservableEntityModelChangeEvent } from "../entity-model.ts";
import type { Entity, EntityIdentifier } from "../entity.ts";

export class DefaultEntityModel implements EntityModel, ObservableEntityModel {
  protected entities: Map<string, Entity> = new Map();
  protected mainEntityIdentifier: EntityIdentifier;
  private eventListeners: Set<(event: ObservableEntityModelChangeEvent) => void> = new Set();

  constructor(mainEntityIdentifier: EntityIdentifier) {
    this.mainEntityIdentifier = mainEntityIdentifier;
  }

  getMainEntity(): Entity {
    return this.getEntity(this.mainEntityIdentifier)!;
  }

  getEntity(identifier: EntityIdentifier): Entity | null {
    return this.entities.get(identifier) ?? null;
  }

  getEntities(): EntitySet {
    return Object.fromEntries(this.entities);
  }

  subscribeToChanges(listener: (event: ObservableEntityModelChangeEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Helper method to update entities and notify listeners about the change.
   */
  protected changeEntitiesAndNotify(createOrUpdate: Entity[], remove: string[]): void {
    const created: Entity[] = [];
    const updated: Entity[] = [];
    const deleted: string[] = [];

    for (const entity of createOrUpdate) {
      if (this.entities.has(entity.identifier)) {
        updated.push(entity);
      } else {
        created.push(entity);
      }
      this.entities.set(entity.identifier, entity);
    }

    for (const identifier of remove) {
      if (this.entities.delete(identifier)) {
        deleted.push(identifier);
      }
    }

    if (created.length > 0 || updated.length > 0 || deleted.length > 0) {
      const event: ObservableEntityModelChangeEvent = { created, updated, deleted };
      for (const listener of this.eventListeners) {
        listener(event);
      }
    }
  }
}
