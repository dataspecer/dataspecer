import {
  Entity, EntityIdentifier, ModelIdentifier,
} from "@dataspecer/entity-model";
import {
  isVisualNode,
  isVisualRelationship,
  VisualEntity,
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
    const visual = next as unknown as VisualEntity;
    if (isVisualNode(visual)) {
      const entity = this.getEntityWeak(visual.representedEntity);
      this.addVisualRepresentation(entity, model, visual.id);
    }
    if (isVisualRelationship(visual)) {
      const entity = this.getEntityWeak(visual.representedRelationship);
      this.addVisualRepresentation(entity, model, visual.id);
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
    const visual = previous as unknown as VisualEntity;
    if (isVisualNode(visual)) {
      const entity = this.getEntityWeak(visual.representedEntity);
      this.removeVisualRepresentation(entity, model, visual.id);
    } else if (isVisualRelationship(visual)) {
      const entity = this.getEntityWeak(visual.representedRelationship);
      this.removeVisualRepresentation(entity, model, visual.id);
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
