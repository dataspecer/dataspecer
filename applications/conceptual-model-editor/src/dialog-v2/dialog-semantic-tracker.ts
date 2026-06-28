import { Entity, EntityIdentifier, ModelIdentifier } from "@dataspecer/entity-model";
import { isProfileClass, isProfileRelationship } from "@dataspecer/profile-model";
import { isSemanticClass, isSemanticRelationship } from "@dataspecer/semantic-model";

import {
  createSemanticCommonTracker,
  createSemanticModelTracker,
  SemanticCommonTrackerEntry,
  SemanticModelEntry,
  Tracker,
} from "../dependency-tracker";
import { selectDomainAndRange } from "../dataspecer/semantic-model";

export class DialogSemanticTracker implements Tracker {

  readonly semanticModels:
    Map<ModelIdentifier, SemanticModelEntry> = new Map();

  readonly semanticClasses:
    Map<EntityIdentifier, DialogSemanticClassEntry> = new Map();

  readonly semanticRelationships:
    Map<EntityIdentifier, DialogSemanticRelationshipEntry> = new Map();

  readonly classProfiles:
    Map<EntityIdentifier, DialogSemanticClassProfileEntry> = new Map();

  readonly relationshipProfiles:
    Map<EntityIdentifier, DialogSemanticRelationshipProfileEntry> = new Map();

  private readonly trackers: Tracker[];

  private readonly onDidChangeCallback: (() => void) | undefined;

  constructor(onDidChange?: () => void) {
    this.onDidChangeCallback = onDidChange;
    this.trackers = [
      createSemanticModelTracker(this.semanticModels),
      createSemanticCommonTracker(
        (model, entity) => this.getOrCreateEntry(model, entity),
        (id) => this.getEntry(id),
      ),
    ];
  }

  dependencies(entity: Entity): string[] {
    return this.trackers.flatMap(t => t.dependencies?.(entity) ?? []);
  }

  onEntityDidCreate(model: ModelIdentifier, next: Entity): void {
    this.trackers.forEach(t => t.onEntityDidCreate?.(model, next));
    if (isSemanticRelationship(next)) {
      const entry = this.getOrCreateRelationshipEntry(next.id, model);
      const [domain, range] = selectDomainAndRange(next.ends);
      entry.domain = domain?.concept ?? null;
      entry.domainCardinality = domain?.cardinality ?? null;
      entry.range = range?.concept ?? null;
      entry.rangeCardinality = range?.cardinality ?? null;
    }
    if (isProfileClass(next)) {
      const entry = this.getOrCreateClassProfileEntry(next.id, model);
      entry.profiling = [...next.profiling];
    }
    if (isProfileRelationship(next)) {
      const entry = this.getOrCreateRelationshipProfileEntry(next.id, model);
      const [domain, range] = selectDomainAndRange(next.ends);
      entry.profiling = [...(range?.profiling ?? [])];
      entry.domain = domain?.concept ?? null;
      entry.domainCardinality = domain?.cardinality ?? null;
      entry.range = range?.concept ?? null;
      entry.rangeCardinality = range?.cardinality ?? null;
    }
  }

  onEntityDidChange(model: ModelIdentifier, previous: Entity, next: Entity): void {
    this.trackers.forEach(t => t.onEntityDidChange?.(model, previous, next));
    if (isSemanticRelationship(next)) {
      const entry = this.getOrCreateRelationshipEntry(next.id, model);
      const [domain, range] = selectDomainAndRange(next.ends);
      entry.domain = domain?.concept ?? null;
      entry.domainCardinality = domain?.cardinality ?? null;
      entry.range = range?.concept ?? null;
      entry.rangeCardinality = range?.cardinality ?? null;
    }
    if (isProfileClass(next)) {
      const entry = this.getOrCreateClassProfileEntry(next.id, model);
      entry.profiling = [...next.profiling];
    }
    if (isProfileRelationship(next)) {
      const entry = this.getOrCreateRelationshipProfileEntry(next.id, model);
      const [domain, range] = selectDomainAndRange(next.ends);
      entry.profiling = [...(range?.profiling ?? [])];
      entry.domain = domain?.concept ?? null;
      entry.domainCardinality = domain?.cardinality ?? null;
      entry.range = range?.concept ?? null;
      entry.rangeCardinality = range?.cardinality ?? null;
    }
  }

  onEntityDidRemove(model: ModelIdentifier, previous: Entity): void {
    this.trackers.forEach(t => t.onEntityDidRemove?.(model, previous));
    this.semanticClasses.delete(previous.id);
    this.semanticRelationships.delete(previous.id);
    this.classProfiles.delete(previous.id);
    this.relationshipProfiles.delete(previous.id);
  }

  onDependencyDidChange(next: Entity): void {
    this.trackers.forEach(t => t.onDependencyDidChange?.(next));
  }

  onDidUpdate(): void {
    this.onDidChangeCallback?.();
  }

  //
  // Private helpers
  //

  private getOrCreateEntry(
    model: ModelIdentifier, entity: Entity,
  ): SemanticCommonTrackerEntry | null {
    if (isSemanticClass(entity)) {
      return this.getOrCreateClassEntry(entity.id, model);
    }
    if (isSemanticRelationship(entity)) {
      return this.getOrCreateRelationshipEntry(entity.id, model);
    }
    if (isProfileClass(entity)) {
      return this.getOrCreateClassProfileEntry(entity.id, model);
    }
    if (isProfileRelationship(entity)) {
      return this.getOrCreateRelationshipProfileEntry(entity.id, model);
    }
    return null;
  }

  private getEntry(id: EntityIdentifier): SemanticCommonTrackerEntry | null {
    return this.semanticClasses.get(id)
      ?? this.semanticRelationships.get(id)
      ?? this.classProfiles.get(id)
      ?? this.relationshipProfiles.get(id)
      ?? null;
  }

  private getOrCreateClassEntry(
    id: EntityIdentifier, model: ModelIdentifier,
  ): DialogSemanticClassEntry {
    const existing = this.semanticClasses.get(id);
    if (existing !== undefined) {
      return existing;
    }
    const created: DialogSemanticClassEntry = {
      identifier: id,
      model,
      iri: null,
      label: {},
      description: {},
      usageNote: null,
    };
    this.semanticClasses.set(id, created);
    return created;
  }

  private getOrCreateRelationshipEntry(
    id: EntityIdentifier, model: ModelIdentifier,
  ): DialogSemanticRelationshipEntry {
    const existing = this.semanticRelationships.get(id);
    if (existing !== undefined) {
      return existing;
    }
    const created: DialogSemanticRelationshipEntry = {
      identifier: id,
      model,
      iri: null,
      label: {},
      description: {},
      usageNote: null,
      domain: null,
      domainCardinality: null,
      range: null,
      rangeCardinality: null,
    };
    this.semanticRelationships.set(id, created);
    return created;
  }

  private getOrCreateClassProfileEntry(
    id: EntityIdentifier, model: ModelIdentifier,
  ): DialogSemanticClassProfileEntry {
    const existing = this.classProfiles.get(id);
    if (existing !== undefined) {
      return existing;
    }
    const created: DialogSemanticClassProfileEntry = {
      identifier: id,
      model,
      iri: null,
      label: {},
      description: {},
      usageNote: null,
      profiling: [],
    };
    this.classProfiles.set(id, created);
    return created;
  }

  private getOrCreateRelationshipProfileEntry(
    id: EntityIdentifier, model: ModelIdentifier,
  ): DialogSemanticRelationshipProfileEntry {
    const existing = this.relationshipProfiles.get(id);
    if (existing !== undefined) {
      return existing;
    }
    const created: DialogSemanticRelationshipProfileEntry = {
      identifier: id,
      model,
      iri: null,
      label: {},
      description: {},
      usageNote: null,
      profiling: [],
      domain: null,
      domainCardinality: null,
      range: null,
      rangeCardinality: null,
    };
    this.relationshipProfiles.set(id, created);
    return created;
  }

}

//
// DialogSemanticClassEntry
//

export interface DialogSemanticClassEntry extends SemanticCommonTrackerEntry {

  identifier: EntityIdentifier;

  model: ModelIdentifier;

}

//
// DialogSemanticRelationshipEntry
//

export interface DialogSemanticRelationshipEntry extends SemanticCommonTrackerEntry {

  identifier: EntityIdentifier;

  model: ModelIdentifier;

  domain: EntityIdentifier | null;

  domainCardinality: [number, number | null] | null;

  range: EntityIdentifier | null;

  rangeCardinality: [number, number | null] | null;

}

//
// DialogSemanticClassProfileEntry
//

export interface DialogSemanticClassProfileEntry extends SemanticCommonTrackerEntry {

  identifier: EntityIdentifier;

  model: ModelIdentifier;

  /**
   * IDs of the classes this profile is profiling.
   */
  profiling: EntityIdentifier[];

}

//
// DialogSemanticRelationshipProfileEntry
//

export interface DialogSemanticRelationshipProfileEntry extends SemanticCommonTrackerEntry {

  identifier: EntityIdentifier;

  model: ModelIdentifier;

  /**
   * IDs of the relationships this profile is profiling (from range end).
   */
  profiling: EntityIdentifier[];

  domain: EntityIdentifier | null;

  domainCardinality: [number, number | null] | null;

  range: EntityIdentifier | null;

  rangeCardinality: [number, number | null] | null;

}
