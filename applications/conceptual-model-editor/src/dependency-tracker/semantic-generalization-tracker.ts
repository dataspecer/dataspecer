import {
  Entity, EntityIdentifier, ModelIdentifier,
} from "@dataspecer/entity-model";
import { isSemanticGeneralization } from "@dataspecer/semantic-model";
import {
  isSemanticModelGeneralizationProfile,
} from "@dataspecer/profile-model";

import { Tracker } from "./dependency-tracker";
import { addToArray, removeFromArray } from "./utilities";

/**
 * Track generalizations into generalizationOf property.
 */
export function createSemanticGeneralizationOfTracker(
  getEntityWeak: (entity: EntityIdentifier)
    => SemanticGeneralizationOfEntry,
): Tracker {
  return new SemanticGeneralizationOfTracker(getEntityWeak);
}

class SemanticGeneralizationOfTracker implements Tracker {

  getEntityWeak: (entity: EntityIdentifier)
    => SemanticGeneralizationOfEntry;

  constructor(getEntityWeak: typeof this.getEntityWeak) {
    this.getEntityWeak = getEntityWeak;
  }

  onEntityDidCreate(_: ModelIdentifier, next: Entity): void {
    if (isSemanticGeneralization(next)
      || isSemanticModelGeneralizationProfile(next)) {
      const parent = this.getEntityWeak(next.parent);
      addToArray(parent.generalizationOf, next.child);
    }
  }

  onEntityDidChange(_: ModelIdentifier, previous: Entity, next: Entity): void {
    if (isSemanticGeneralization(next)
      || isSemanticModelGeneralizationProfile(next)) {
      this.updateGeneralization(previous as any, next);
    }
  }

  private updateGeneralization(
    previous: { child: EntityIdentifier, parent: EntityIdentifier },
    next: { child: EntityIdentifier, parent: EntityIdentifier },
  ) {
    // Check if there was a change.
    if (previous.child === next.child && previous.parent === next.parent) {
      return;
    }
    // Remove previous.
    {
      const parent = this.getEntityWeak(previous.parent);
      removeFromArray(parent.generalizationOf, previous.child);
    }
    // Add next.
    {
      const parent = this.getEntityWeak(next.parent);
      addToArray(parent.generalizationOf, next.child);
    }
  }

  onEntityDidRemove(_: ModelIdentifier, previous: Entity): void {
    if (isSemanticGeneralization(previous)
      || isSemanticModelGeneralizationProfile(previous)) {
      const parent = this.getEntityWeak(previous.parent);
      removeFromArray(parent.generalizationOf, previous.child);
    }
  }

}

export interface SemanticGeneralizationOfEntry {

  /**
   * List of entity identifiers this entity is generalization of.
   */
  generalizationOf: EntityIdentifier[];

}

/**
 * Track generalizations into specializationOf property.
 */
export function createSemanticSpecializationOfTracker(
  getEntityWeak: (entity: EntityIdentifier)
    => SemanticSpecializationOfEntry,
): Tracker {
  return new SemanticSpecializationOfTracker(getEntityWeak);
}

class SemanticSpecializationOfTracker implements Tracker {

  getEntityWeak: (entity: EntityIdentifier)
    => SemanticSpecializationOfEntry;

  constructor(getEntityWeak: typeof this.getEntityWeak) {
    this.getEntityWeak = getEntityWeak;
  }

  onEntityDidCreate(_: ModelIdentifier, next: Entity): void {
    if (isSemanticGeneralization(next)
      || isSemanticModelGeneralizationProfile(next)) {
      const child = this.getEntityWeak(next.child);
      addToArray(child.specializationOf, next.parent);
    }
  }

  onEntityDidChange(_: ModelIdentifier, previous: Entity, next: Entity): void {
    if (isSemanticGeneralization(next)
      || isSemanticModelGeneralizationProfile(next)) {
      this.updateGeneralization(previous as any, next);
    }
  }

  private updateGeneralization(
    previous: { child: EntityIdentifier, parent: EntityIdentifier },
    next: { child: EntityIdentifier, parent: EntityIdentifier },
  ) {
    // Check if there was a change.
    if (previous.child === next.child && previous.parent === next.parent) {
      return;
    }
    // Remove previous.
    {
      const child = this.getEntityWeak(previous.child);
      removeFromArray(child.specializationOf, previous.parent);
    }
    // Add next.
    {
      const child = this.getEntityWeak(next.child);
      addToArray(child.specializationOf, next.parent);
    }
  }

  onEntityDidRemove(_: ModelIdentifier, previous: Entity): void {
    if (isSemanticGeneralization(previous)
      || isSemanticModelGeneralizationProfile(previous)) {
      const child = this.getEntityWeak(previous.child);
      removeFromArray(child.specializationOf, previous.parent);
    }
  }

}


export interface SemanticSpecializationOfEntry {

  /**
   * List of entity identifiers this entity is specialization of.
   */
  specializationOf: EntityIdentifier[];

}
