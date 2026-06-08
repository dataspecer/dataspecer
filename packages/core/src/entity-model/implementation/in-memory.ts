import type { EntityModel } from "../entity-model.ts";
import type { Entity, EntityArray, EntityIdentifier } from "../entity.ts";
import type { EntityModelChangeEvent, ObservableEntityModel } from "../observable.ts";

export class InMemoryEntityModel<EntityType extends Entity = Entity, MainEntityType extends EntityType = EntityType> implements EntityModel<EntityType, MainEntityType>, ObservableEntityModel {
  id: string;

  protected entities: Map<EntityIdentifier, EntityType> = new Map();
  protected subscribers: ((event: EntityModelChangeEvent) => void)[] = [];

  getMainEntity(): MainEntityType {
    return this.getEntity(this.id) as MainEntityType;
  }

  getEntities(): EntityArray<EntityType> {
    return Array.from(this.entities.values());
  }

  getEntity(id: EntityIdentifier | null | undefined): EntityType | null {
    if (id === null || id === undefined) {
      return null;
    }
    return this.entities.get(id) || null;
  }

  /**
   * Helper method that changes entities in the map and notifies subscribers synchronously.
   */
  protected changeEntities(changed: EntityType[], removed: EntityIdentifier[]): void {
    const changeEvent: EntityModelChangeEvent = {
      entityChanges: []
    };

    for (const entity of changed) {
      const previous = this.entities.get(entity.id) || null;
      this.entities.set(entity.id, entity);
      changeEvent.entityChanges.push({
        previous,
        next: entity
      });
    }
    for (const id of removed) {
      const previous = this.entities.get(id) || null;
      if (previous === null) {
        continue;
      }
      changeEvent.entityChanges.push({
        previous,
        next: null
      });
      this.entities.delete(id);
    }

    for (const subscriber of this.subscribers) {
      subscriber(changeEvent);
    }
  }

  subscribeToEntityChanges(listener: (entityChaneEvent: EntityModelChangeEvent) => void): () => void {
    this.subscribers.push(listener);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== listener);
    };
  }
}
