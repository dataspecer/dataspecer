import {
  Entity, EntityIdentifier, ModelIdentifier,
} from "@dataspecer/entity-model";
import {
  isVisualNode,
  isVisualRelationship,
  VisualNode,
  VisualRelationship,
} from "@dataspecer/visual-model";

import { Tracker } from "./dependency-tracker";

export function createVisualRepresentationTracker(
  getEntityWeak: (entity: EntityIdentifier)
    => VisualRepresentationEntry | null,
): Tracker {
  return new VisualRepresentationTracker(getEntityWeak);
}

/**
 * Track visual representation of semantic entities.
 */
class VisualRepresentationTracker implements Tracker {

  readonly getEntityWeak: (entity: EntityIdentifier) =>
    VisualRepresentationEntry | null;

  constructor(getEntityWeak: typeof this.getEntityWeak) {
    this.getEntityWeak = getEntityWeak;
  }

  onEntityDidCreate(model: ModelIdentifier, next: Entity) {
    // We need to cast to any here as VisualEntity is using identifier not id.
    if (isVisualNode(next as any)) {
      const typed = next as unknown as VisualNode;
      const entity = this.getEntityWeak(typed.representedEntity);
      this.addVisualRepresentation(entity, model, typed.identifier);
    }
    if (isVisualRelationship(next as any)) {
      const typed = next as unknown as VisualRelationship;
      const entity = this.getEntityWeak(typed.representedRelationship);
      this.addVisualRepresentation(entity, model, typed.identifier);
    }
  }

  /**
   * @param entity Entity to add visual representation to to.
   * @param visualModel
   * @param visualEntity
   */
  private addVisualRepresentation(
    entity: VisualRepresentationEntry | null,
    visualModel: ModelIdentifier,
    visualEntity: EntityIdentifier,
  ): void {
    if (entity === null) {
      return;
    }
    if (entity.visualEntities[visualModel] === undefined) {
      entity.visualEntities[visualModel] = [visualEntity];
    } else {
      entity.visualEntities[visualModel].push(visualEntity);
    }
  }

  onEntityDidRemove(model: ModelIdentifier, previous: Entity): void {
    if (isVisualNode(previous as any)) {
      const typed = previous as unknown as VisualNode;
      const entity = this.getEntityWeak(typed.representedEntity);
      this.removeVisualRepresentation(entity, model, typed.identifier);
    } else if (isVisualRelationship(previous as any)) {
      const typed = previous as unknown as VisualRelationship;
      const entity = this.getEntityWeak(typed.representedRelationship);
      this.removeVisualRepresentation(entity, model, typed.identifier);
    }
  }

  private removeVisualRepresentation(
    entity: VisualRepresentationEntry | null,
    visualModel: ModelIdentifier,
    visualIdentifier: EntityIdentifier,
  ): void {
    if (entity === null) {
      return;
    }
    const items = entity.visualEntities[visualModel];
    if (items === undefined) {
      return;
    }
    const index = items.indexOf(visualIdentifier);
    if (index === -1) {
      return;
    }
    items.splice(index, 1);
  }

}

export interface VisualRepresentationEntry {

  /**
   * For a visual model tracks list of entities representing the entity.
   */
  visualEntities: { [identifier: ModelIdentifier]: EntityIdentifier[] };

}
