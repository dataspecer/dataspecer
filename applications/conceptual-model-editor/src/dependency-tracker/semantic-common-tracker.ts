import {
  Entity,
  EntityIdentifier,
  ModelIdentifier,
} from "@dataspecer/entity-model";
import {
  isProfileClass,
  isProfileGeneralization,
  isProfileRelationship,
} from "@dataspecer/profile-model";
import {
  isSemanticClass,
  isSemanticGeneralization,
  isSemanticRelationship,
} from "@dataspecer/semantic-model";

import { Tracker } from "./dependency-tracker";
import { selectDomainAndRange } from "../dataspecer/semantic-model";

export function createSemanticCommonTracker(
  getEntity: (model: ModelIdentifier, entity: Entity)
    => SemanticCommonTrackerEntry | null,
  getEntityWeak: (entity: EntityIdentifier)
    => SemanticCommonTrackerEntry | null,
): Tracker {
  return new SemanticCommonTracker(getEntity, getEntityWeak);
}

/**
 * Track common properties of semantic entities.
 * This includes IRI, label, description, and usage note.
 */
class SemanticCommonTracker implements Tracker {

  readonly getEntity: (model: ModelIdentifier, entity: Entity)
    => SemanticCommonTrackerEntry | null;

  readonly getEntityWeak: (entity: EntityIdentifier)
    => SemanticCommonTrackerEntry | null;

  constructor(
    getEntity: typeof this.getEntity,
    getEntityWeak: typeof this.getEntityWeak,
  ) {
    this.getEntity = getEntity;
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
    if (isSemanticClass(next)) {
      const entity = this.getEntity(model, next);
      if (entity !== null) {
        entity.iri = next.iri;
        entity.label = { ...entity.label, ...next.name };
        entity.description = { ...entity.description, ...next.description };
      }
    }
    if (isProfileClass(next)) {
      const entity = this.getEntity(model, next);
      if (entity !== null) {
        entity.iri = next.iri;
        entity.label = { ...entity.label, ...next.name };
        entity.description = { ...entity.description, ...next.description };
        entity.usageNote = { ...entity.usageNote, ...next.usageNote };
      }
    }
    if (isSemanticRelationship(next)) {
      const entity = this.getEntity(model, next);
      if (entity !== null) {
        const [_, range] = selectDomainAndRange(next.ends);
        entity.iri = range.iri;
        entity.label = { ...entity.label, ...range.name };
        entity.description = { ...entity.description, ...next.description };
      }
    }
    if (isProfileRelationship(next)) {
      const entity = this.getEntity(model, next);
      if (entity !== null) {
        const [_, range] = selectDomainAndRange(next.ends);
        entity.iri = range.iri;
        entity.label = { ...entity.label, ...range.name };
        entity.description = { ...entity.description, ...range.description };
        entity.usageNote = { ...entity.usageNote, ...range.usageNote };
      }
    }
    if (isSemanticGeneralization(next) || isProfileGeneralization(next)) {
      const entity = this.getEntity(model, next);
      if (entity !== null) {
        entity.iri = next.iri;
      }
    }
  }

  onEntityDidChange(model: ModelIdentifier, _: Entity, next: Entity): void {
    if (isSemanticClass(next)) {
      const entity = this.getEntity(model, next);
      if (entity !== null) {
        entity.iri = next.iri;
        entity.label = next.name ?? {};
        entity.description = next.description ?? {};
      }
    }
    if (isProfileClass(next)) {
      const entity = this.getEntity(model, next);
      if (entity !== null) {
        entity.iri = next.iri;
        entity.label = next.name ?? {};
        entity.description = next.description ?? {};
        entity.usageNote = next.usageNote ?? {};
      }
    }
    if (isSemanticRelationship(next)) {
      const entity = this.getEntity(model, next);
      if (entity !== null) {
        const [_, range] = selectDomainAndRange(next.ends);
        entity.iri = range.iri;
        entity.label = range.name;
      }
    }
    if (isProfileRelationship(next)) {
      const entity = this.getEntity(model, next);
      if (entity !== null) {
        const [_, range] = selectDomainAndRange(next.ends);
        entity.iri = range.iri;
        entity.label = range.name ?? {};
        entity.description = range.description ?? {};
        entity.usageNote = range.usageNote ?? {};
      }
    }
    if (isSemanticGeneralization(next) || isProfileGeneralization(next)) {
      const entity = this.getEntity(model, next);
      if (entity !== null) {
        entity.iri = next.iri;
      }
    }
  }

  onDependencyDidChange(next: Entity): void {
    const entity = this.getEntityWeak(next.id);
    if (entity === null) {
      return;
    }
    if (isProfileClass(next)) {
      this.updateFromProfiled(next.id, next, entity);
    } else if (isProfileRelationship(next)) {
      const [, range] = selectDomainAndRange(next.ends);
      this.updateFromProfiled(next.id, range, entity);
    }
  }

  /**
   * Propagate changes from profiled entities.
   */
  private updateFromProfiled(
    identifier: EntityIdentifier,
    next: {
      iri: string | null,
      name: LanguageString | null,
      nameFromProfiled: string | null
    },
    entity: SemanticCommonTrackerEntry,
  ) {
    if (next.nameFromProfiled === null) {
      entity.label = next.name ?? { "": entity.iri ?? identifier };
    } else {
      const source = this.getEntityWeak(next.nameFromProfiled);
      if (source === null) {
        return;
      } else {
        entity.label = source.label;
      }
    }
  }

}

export interface SemanticCommonTrackerEntry {

  iri: string | null;

  label: LanguageString;

  description: LanguageString;

  usageNote: LanguageString | null;

}

type LanguageString = { [key: string]: string };
