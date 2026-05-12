import {
  Entity, EntityIdentifier, ModelIdentifier,
} from "@dataspecer/entity-model";
import {
  isProfileClass, isProfileRelationship,
} from "@dataspecer/profile-model";

import { Tracker } from "./dependency-tracker";
import { selectDomainAndRange } from "../dataspecer/semantic-model";
import { addToArray, diffArrays, removeFromArray } from "./utilities";

/**
 * Track profiles into profiledBy property.
 */
export function createSemanticProfiledByTracker(
  getEntityWeak: (entity: EntityIdentifier) => SemanticProfiledByEntry,
) {
  return new SemanticProfiledByTracker(getEntityWeak);
}

class SemanticProfiledByTracker implements Tracker {

  readonly getEntityWeak: (entity: EntityIdentifier)
    => SemanticProfiledByEntry;

  constructor(getEntityWeak: typeof this.getEntityWeak) {
    this.getEntityWeak = getEntityWeak;
  }

  dependencies(entity: Entity): string[] {
    const dependencies: string[] = [];
    if (isProfileClass(entity)) {
      dependencies.push(...entity.profiling);
    }
    if (isProfileRelationship(entity)) {
      entity.ends.forEach(end => {
        dependencies.push(...end.profiling);
        dependencies.push(end.concept);
      });
    }
    return dependencies;
  }

  onEntityDidCreate(model: ModelIdentifier, next: Entity): void {
    if (isProfileClass(next)) {
      next.profiling.forEach(identifier => {
        const profiled = this.getEntityWeak(identifier);
        if (profiled !== null) {
          secureInArrayInPlace(next.id, profiled.profiledBy);
        }
      });
    }
    if (isProfileRelationship(next)) {
      const [_, range] = selectDomainAndRange(next.ends);
      range.profiling.forEach(identifier => {
        const profiled = this.getEntityWeak(identifier);
        if (profiled !== null) {
          secureInArrayInPlace(next.id, profiled.profiledBy);
        }
      });
    }
  }

  onEntityDidChange(
    model: ModelIdentifier, previous: Entity, next: Entity,
  ): void {
    if (isProfileClass(next)) {
      // Update profile of information.
      this.updateProfile(
        model, next.id,
        (previous as any).profiling,
        next.profiling);
    }
    if (isProfileRelationship(next)) {
      const [, range] = selectDomainAndRange(next.ends);
      const [, previousRange] = selectDomainAndRange((previous as any).ends);
      this.updateProfile(
        model, next.id,
        (previousRange as any).profiling,
        range.profiling);
    }
  }

  private updateProfile(
    _model: ModelIdentifier,
    identifier: EntityIdentifier,
    previousProfiling: EntityIdentifier[],
    nextProfiling: EntityIdentifier[],
  ) {
    if (previousProfiling === nextProfiling) {
      return;
    }
    const [removed, added] = diffArrays(previousProfiling, nextProfiling);
    for (const item of removed) {
      const profiled = this.getEntityWeak(item);
      removeFromArray(profiled.profiledBy, identifier);
    }
    for (const item of added) {
      const profiled = this.getEntityWeak(item);
      addToArray(profiled.profiledBy, identifier);
    }
  }

}

function secureInArrayInPlace<Type>(item: Type, items: Type[]) {
  if (items.includes(item)) {
    return;
  }
  items.push(item);
}

export interface SemanticProfiledByEntry {

  profiledBy: EntityIdentifier[];

}
