import {
  Entity,
  EntityIdentifier,
  ModelIdentifier,
} from "@dataspecer/entity-model";
import {
  isProfileClass,
  isProfileRelationship,
} from "@dataspecer/profile-model";
import {
  isSemanticRelationship,
} from "@dataspecer/semantic-model";
import {
  ColorGenerator,
  createColorGenerator,
} from "@dataspecer/visual-model";

import {
  createSemanticGeneralizationOfTracker,
  createSemanticLabelTracker,
  createSemanticModelTracker,
  createSemanticProfiledByTracker,
  createVisualModelTracker,
  createVisualRepresentationTracker,
  effectiveLabel,
  SemanticModelEntry,
  Tracker,
  VisualModelEntry,
} from "../dependency-tracker";
import { createLogger } from "../application";

const logger = createLogger(import.meta.url);

export class CatalogTracker implements Tracker {

  readonly trackers: Tracker[] = [];

  readonly semanticModels:
    Map<ModelIdentifier, SemanticModelEntry> = new Map();

  readonly entities: Map<EntityIdentifier, CatalogEntity> = new Map();

  readonly partialEntities: Map<EntityIdentifier, PartialCatalogEntity>
    = new Map();

  readonly visualModels: Map<ModelIdentifier, VisualModelEntry> = new Map();

  /**
   * Call back to invoke if there is a change in the state.
   */
  private readonly onDidChangeCallback: (tracker: CatalogTracker) => void;

  private readonly colorGenerator: ColorGenerator = createColorGenerator();

  constructor(onDidChangeCallback: (tracker: CatalogTracker) => void) {
    this.trackers = [
      createSemanticModelTracker(this.semanticModels),
      createSemanticLabelTracker(
        (model, entity) =>
          this.getOrCreateCatalogEntity(entity.id, model, entity),
        (identifier) => this.getOrCreatePartialCatalogEntity(identifier),
      ),
      createVisualModelTracker(this.visualModels),
      createVisualRepresentationTracker(
        identifier => this.getOrCreatePartialCatalogEntity(identifier)),
      createSemanticGeneralizationOfTracker(
        identifier => this.getOrCreatePartialCatalogEntity(identifier)),
      createSemanticProfiledByTracker(
        identifier => this.getOrCreatePartialCatalogEntity(identifier)),
    ];
    this.onDidChangeCallback = onDidChangeCallback;
  }

  dependencies(entity: Entity): string[] {
    const dependencies: string[] =
      this.trackers.map(tracker => tracker?.dependencies?.(entity) ?? [])
        .flat();

    // Semantic dependency collector.
    if (isSemanticRelationship(entity)) {
      entity.ends.forEach(end => {
        if (end.concept !== null) {
          dependencies.push(end.concept);
        }
      });
    }
    // Semantic profile dependency collector.
    if (isProfileClass(entity)) {
      dependencies.push(...entity.profiling);
    }
    if (isProfileRelationship(entity)) {
      entity.ends.forEach(end => {
        dependencies.push(...end.profiling);
        dependencies.push(end.concept);
      });
    }
    // Make it uniq.
    return dependencies;
  }

  /**
   * @returns Catalog entity for given identifier.
   */
  private getOrCreateCatalogEntity(
    identifier: EntityIdentifier,
    model: ModelIdentifier,
    entity: Entity
  ): CatalogEntity {
    // Try to get and return the entity.
    let existing = this.entities.get(identifier);
    if (existing !== undefined) {
      return existing;
    }
    // Check for partial.
    const partial = this.partialEntities.get(identifier);
    if (partial !== undefined) {
      this.partialEntities.delete(identifier);
      const fromPartial = {
        ...partial,
        entity,
        model
      };
      this.entities.set(identifier, fromPartial);
      return fromPartial;
    }
    // Create a new entity.
    const created: CatalogEntity = {
      identifier: identifier,
      entity: entity,
      model: model,
      iri: null,
      label: {},
      profiledBy: [],
      generalizationOf: [],
      visualEntities: {},
    };
    this.entities.set(identifier, created);
    return created;
  }

  private getOrCreatePartialCatalogEntity(
    identifier: EntityIdentifier,
  ): PartialCatalogEntity {
    // Try to get and return the entity.
    let entity = this.entities.get(identifier);
    if (entity !== undefined) {
      return entity;
    }
    // Try to get and return the partial.
    let partial = this.partialEntities.get(identifier);
    if (partial !== undefined) {
      return partial;
    }
    // Create a new one.
    const created: PartialCatalogEntity = {
      identifier: identifier,
      iri: null,
      label: {},
      profiledBy: [],
      generalizationOf: [],
      visualEntities: {},

    };
    this.partialEntities.set(identifier, created);
    return created;
  }

  onEntityDidCreate(model: ModelIdentifier, next: Entity): void {
    this.trackers.forEach(tracker =>
      tracker?.onEntityDidCreate?.(model, next));
  }

  onEntityDidChange(
    model: ModelIdentifier, previous: Entity, next: Entity,
  ): void {
    this.trackers.forEach(tracker =>
      tracker?.onEntityDidChange?.(model, previous, next));
  }

  onEntityDidRemove(model: ModelIdentifier, previous: Entity): void {
    this.trackers.forEach(tracker => tracker?.onEntityDidRemove?.(model, previous));
    // Make sure we no longer store any information about the entity.
    this.entities.delete(previous.id);
  }

  onDependencyDidChange(next: Entity): void {
    this.trackers.forEach(tracker => tracker?.onDependencyDidChange?.(next));
  }

  onDidUpdate() {
    this.onDidChangeCallback?.(this);
  };

  //
  // API methods.
  //

  getEntityLabel(
    languages: string[],
    identifier: EntityIdentifier | undefined,
  ): string {
    if (identifier === undefined) {
      return "";
    }
    const entity = this.entities.get(identifier)
    if (entity !== undefined) {
      return effectiveLabel(languages, entity);
    }
    logger.missingEntity(identifier);
    const partial = this.partialEntities.get(identifier);
    if (partial !== undefined) {
      return effectiveLabel(languages, partial);
    }
    return identifier;
  }

  getModelColor(
    model: ModelIdentifier,
    visualModel: string | null,
  ): string {
    if (visualModel === null) {
      return this.colorGenerator.generateModelColor(model);
    }
    const visual = this.visualModels.get(visualModel)
    return visual?.colors[model]
      ?? this.colorGenerator.generateModelColor(model);
  }

  hasVisualEntity(
    entity: CatalogEntity,
    visualModelIdentifier: string | null,
  ): boolean {
    if (visualModelIdentifier === null) {
      return false;
    }
    const visual = entity.visualEntities[visualModelIdentifier];
    return visual?.length > 0;
  }

}

/**
 * We use this to reference {@link CatalogEntity} that has not yet been created.
 */
interface PartialCatalogEntity {

  identifier: EntityIdentifier;

  iri: string | null;

  label: LanguageString;

  /**
   * List of entities that profile this entity.
   */
  profiledBy: EntityIdentifier[];

  /**
   * List of entities that are specialization of this entity.
   */
  generalizationOf: EntityIdentifier[];

  /**
   * List of associated visual entities withing a visual model.
   */
  visualEntities: { [identifier: ModelIdentifier]: EntityIdentifier[] };

}

export interface CatalogEntity extends PartialCatalogEntity {

  entity: Entity;

  model: ModelIdentifier;

}

type LanguageString = { [key: string]: string };
