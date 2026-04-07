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
  isSemanticGeneralization,
  isSemanticRelationship,
} from "@dataspecer/semantic-model";
import {
  ColorGenerator,
  createColorGenerator,
} from "@dataspecer/visual-model";

import { selectDomainAndRange } from "../dataspecer/semantic-model";
import { languageStringToStringNext } from "../utilities/string";
import {
  createSemanticLabelTracker,
  createSemanticModelTracker,
  createVisualModelTracker,
  createVisualRepresentationTracker,
  SemanticModelEntry,
  Tracker,
  VisualModelEntry,
} from "../dependency-tracker";

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
        (entity) =>
          this.getOrCreatePartialCatalogEntity(entity),
      ),
      createVisualModelTracker(this.visualModels),
      createVisualRepresentationTracker(
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
    if (isSemanticGeneralization(entity)) {
      dependencies.push(entity.child, entity.parent);
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
    if (isProfileGeneralization(entity)) {
      dependencies.push(entity.child, entity.parent);
    }
    // Make it uniq.
    return dependencies;
  }

  onEntityDidCreate(model: ModelIdentifier, next: Entity): void {
    this.trackers.forEach(tracker => tracker?.onEntityDidCreate?.(model, next));
    if (isSemanticGeneralization(next)) {
      const child = this.getOrCreatePartialCatalogEntity(next.child);
      secureInArrayInPlace(next.parent, child.generalizationOf);
    }
    if (isProfileClass(next)) {
      next.profiling.forEach(identifier => {
        const profiled = this.getOrCreatePartialCatalogEntity(identifier);
        secureInArrayInPlace(next.id, profiled.profiledBy);
      });
    }
    if (isProfileRelationship(next)) {
      const [_, range] = selectDomainAndRange(next.ends);
      range.profiling.forEach(identifier => {
        const profiled = this.getOrCreatePartialCatalogEntity(identifier);
        secureInArrayInPlace(next.id, profiled.profiledBy);
      });
    }
    if (isProfileGeneralization(next)) {
      const child = this.getOrCreatePartialCatalogEntity(next.child);
      secureInArrayInPlace(next.parent, child.generalizationOf);
    }
  }

  /**
   * @param model
   * @param identifier
   * @param entity
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
    const created : PartialCatalogEntity = {
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

  onEntityDidChange(
    model: ModelIdentifier, previous: Entity, next: Entity,
  ): void {
    this.trackers.forEach(tracker => tracker?.onEntityDidChange?.(model, previous, next));

    if (isSemanticGeneralization(next)) {
      // Update generalization information.
      this.updateGeneralization(model, previous as any, next);
    } else if (isProfileClass(next)) {
      // Update profile of information.
      this.updateProfile(
        model, next.id, (previous as any).profiling, next.profiling);
    } else if (isProfileRelationship(next)) {
      const [, range] = selectDomainAndRange(next.ends);
      // Update profile of information.
      const [, previousRange] = selectDomainAndRange((previous as any).ends);
      this.updateProfile(
        model, next.id, (previousRange as any).profiling, range.profiling);
    } else if (isProfileGeneralization(next)) {
      // Update generalization of information.
      this.updateGeneralization(model, previous as any, next);
    }
  }

  private updateGeneralization(
    _model: ModelIdentifier,
    previous: { child: EntityIdentifier, parent: EntityIdentifier },
    next: { child: EntityIdentifier, parent: EntityIdentifier },
  ) {
    // Check if there was a change.
    if (previous.child === next.child && previous.parent === next.parent) {
      return;
    }
    // Remove previous.
    {
      const child = this.getOrCreatePartialCatalogEntity(previous.child);
      removeFromArrayInPlace(previous.parent, child.generalizationOf);
    }
    // Add next.
    {
      const child = this.getOrCreatePartialCatalogEntity(next.child);
      secureInArrayInPlace(next.parent, child.generalizationOf);
    }
  }

  private updateProfile(
    _model: ModelIdentifier,
    id: EntityIdentifier,
    previous: EntityIdentifier[],
    next: EntityIdentifier[],
  ) {
    if (previous === next) {
      return;
    }
    const [removed, added] = diffArrays(previous, next);
    for (const item of removed) {
      const profiled = this.getOrCreatePartialCatalogEntity(item);
      removeFromArrayInPlace(id, profiled.profiledBy);
    }
    for (const item of added) {
      const profiled = this.getOrCreatePartialCatalogEntity(item);
      secureInArrayInPlace(id, profiled.profiledBy);
    }
  }

  onEntityDidRemove(model: ModelIdentifier, previous: Entity): void {
    this.trackers.forEach(tracker => tracker?.onEntityDidRemove?.(model, previous));
    // We just try to delete the entity.
    this.entities.delete(previous.id);
  }

  onDependenciesDidChange(next: Entity): void {
    this.trackers.forEach(tracker => tracker?.onDependenciesDidChange?.(next));
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
  ): string | undefined {
    if (identifier === undefined) {
      return undefined;
    }
    const entity = this.entities.get(identifier);
    if (entity === undefined) {
      return undefined;
    }
    return getEntityLabel(languages, entity);
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
 * Add item to the array if not present.
 */
function secureInArrayInPlace<Type>(item: Type, items: Type[]) {
  if (items.includes(item)) {
    return;
  }
  items.push(item);
}

function removeFromArrayInPlace<Type>(item: Type, items: Type[]) {
  const index = items.indexOf(item);
  if (index === -1) {
    return;
  }
  items.splice(index, 1);
}

function diffArrays<T>(
  previous: T[], next: T[],
): [T[], T[]] {
  const removed: T[] = previous.filter(item => !next.includes(item));
  const added: T[] = next.filter(item => !previous.includes(item));
  return [removed, added];
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
   * List of all entities that this entity is generalization of.
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

export function getEntityLabel(
  languages: string[],
  { label, iri, identifier }: CatalogEntity,
): string {
  if (label === null) {
    return iri ?? identifier;
  }
  const result = languageStringToStringNext(languages, label);
  if (result === "") {
    return iri ?? identifier;
  }
  return result;
}
