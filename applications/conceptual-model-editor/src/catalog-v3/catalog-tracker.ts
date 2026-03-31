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
import {
  isExternalSemanticModelEntity,
  isPimStoreModelEntity,
  isSemanticModelEntity,
  isVisualModelEntity,
} from "./model-observer";
import { languageStringToStringNext } from "../utilities/string";
import {
  isModelVisualInformation,
  isVisualNode,
  isVisualRelationship,
  VisualNode,
  VisualRelationship,
  VisualModelData as VisualModelInformation,
  ColorGenerator,
  createColorGenerator,

} from "@dataspecer/visual-model";
import { removeFromArray } from "../utilities/functional";

export class CatalogTracker implements Tracker {

  readonly semanticModels: Map<ModelIdentifier, SemanticModelData> = new Map();

  readonly entities: Map<EntityIdentifier, CatalogEntity> = new Map();

  readonly partialEntities: Map<EntityIdentifier, PartialCatalogEntity>
    = new Map();

  readonly visualModels: Map<ModelIdentifier, VisualModelData> = new Map();

  /**
   * Call back to invoke if there is a change in the state.
   */
  private readonly onDidChangeCallback: (tracker: CatalogTracker) => void;

  private readonly colorGenerator: ColorGenerator = createColorGenerator();

  constructor(
    onDidChangeCallback: (tracker: CatalogTracker) => void,
  ) {
    this.onDidChangeCallback = onDidChangeCallback;
  }

  dependencies(entity: Entity): string[] {
    const dependencies: string[] = [];
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
    return [... new Set(dependencies)];
  }

  onEntityDidCreate(model: ModelIdentifier, next: Entity): void {
    // TODO: A single entity can have multiple types, we we support only one.
    if (isSemanticModelEntity(next)) {
      this.semanticModels.set(model, {
        metadataEntity: next.id,
        model: model,
        label: next.label,
        isExternal: false,
        isReadOnly: false,
      });
    } else if (isExternalSemanticModelEntity(next)) {
      this.semanticModels.set(model, {
        metadataEntity: next.id,
        model: model,
        label: next.label,
        isExternal: true,
        isReadOnly: true,
      });
    } else if (isPimStoreModelEntity(next)) {
      this.semanticModels.set(model, {
        metadataEntity: next.id,
        model: model,
        label: next.label,
        isExternal: false,
        isReadOnly: true,
      });
    } else if (isVisualModelEntity(next)) {
      this.visualModels.set(model, {
        metadataEntity: next.id,
        model: model,
        colors: {},
        label: {},
      });
    } else if (next.type.includes("entity-model-type")) {
      // Contains information about the visual model see ModelEntity.
      const visualData = this.getOrCreateVisualModelData(model);
      visualData.metadataEntity = next.id;
      visualData.label = (next as any).label ?? {};
    } else if (isSemanticClass(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      entity.iri = next.iri;
      entity.label = next.name;
    } else if (isSemanticRelationship(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      const [_, range] = selectDomainAndRange(next.ends);
      entity.iri = range.iri;
      entity.label = range.name;
    } else if (isSemanticGeneralization(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      entity.iri = next.iri;
      // Add generalization information.
      const child = this.getOrCreatePartialCatalogEntity(next.child);
      secureInArrayInPlace(next.parent, child.generalizationOf);
    } else if (isProfileClass(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      entity.iri = next.iri;
      entity.label = next.name ?? {};
      // Add profile of information.
      next.profiling.forEach(identifier => {
        const profiled = this.getOrCreatePartialCatalogEntity(identifier);
        secureInArrayInPlace(next.id, profiled.profiledBy);
      });
    } else if (isProfileRelationship(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      const [_, range] = selectDomainAndRange(next.ends);
      entity.iri = range.iri;
      entity.label = range.name ?? {};
      // Add profile of information.
      range.profiling.forEach(identifier => {
        const profiled = this.getOrCreatePartialCatalogEntity(identifier);
        secureInArrayInPlace(next.id, profiled.profiledBy);
      });
    } else if (isProfileGeneralization(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      entity.iri = next.iri;
      // Add generalization information.
      const child = this.getOrCreatePartialCatalogEntity(next.child);
      secureInArrayInPlace(next.parent, child.generalizationOf);
    }
    // We need to cast to any here as VisualEntity is using identifier not id.
    else if (isVisualNode(next as any)) {
      const typed = next as unknown as VisualNode;
      const entity = this.getOrCreatePartialCatalogEntity(
        typed.representedEntity, /* typed.model */);
      this.addVisualRepresentation(entity, model, typed.identifier);
    } else if (isVisualRelationship(next as any)) {
      const typed = next as unknown as VisualRelationship;
      const entity = this.getOrCreatePartialCatalogEntity(
        typed.representedRelationship, /* typed.model */);
      this.addVisualRepresentation(entity, model, typed.identifier);
    } else if (isModelVisualInformation(next as any)) {
      const typed = next as unknown as VisualModelInformation;
      const visualModel = this.getOrCreateVisualModelData(model);
      if (typed.representedModel !== null && typed.color !== null) {
        visualModel.colors[typed.representedModel] = typed.color;
      }
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
    const created = {
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
    let existing = this.partialEntities.get(identifier);
    if (existing !== undefined) {
      return existing;
    }
    // Create a new one.
    const created = {
      identifier: identifier,
      entity: null,
      model: null,
      iri: null,
      label: {},
      profiledBy: [],
      generalizationOf: [],
      visualEntities: {},
    };
    this.partialEntities.set(identifier, created);
    return created;
  }

  /**
   * @param entity Entity to add visual representation to to.
   * @param visualModel
   * @param visualIdentifier
   */
  private addVisualRepresentation(
    entity: PartialCatalogEntity,
    visualModel: ModelIdentifier,
    visualIdentifier: EntityIdentifier,
  ): void {
    entity.visualEntities[visualModel] = [
      ...(entity.visualEntities[visualModel] ?? []),
      visualIdentifier,
    ];
  }

  private getOrCreateVisualModelData(
    model: ModelIdentifier,
  ): VisualModelData {
    let result = this.visualModels.get(model);
    if (result === undefined) {
      result = {
        metadataEntity: null,
        model: model,
        label: {},
        colors: {},
      }
    };
    this.visualModels.set(model, result);
    return result;
  }

  onEntityDidChange(model: ModelIdentifier, previous: Entity, next: Entity): void {
    console.log("catalog-tracker.entit-did-change", { model, previous, next });
    if (isSemanticModelEntity(next)) {
      this.updateSemanticModel(model, semanticModel => {
        semanticModel.label = next.label
      });
    } else if (isExternalSemanticModelEntity(next)) {
      this.updateSemanticModel(model, semanticModel => {
        semanticModel.label = next.label
      });
    } else if (isPimStoreModelEntity(next)) {
      this.updateSemanticModel(model, semanticModel => {
        semanticModel.label = next.label
      });
    } else if (isVisualModelEntity(next)) {
      // No action.
    } else if (next.type.includes("entity-model-type")) {
      // No action.
    } else if (isSemanticClass(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      entity.iri = next.iri;
      entity.label = next.name;
    } else if (isSemanticRelationship(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      const [_, range] = selectDomainAndRange(next.ends);
      entity.iri = range.iri;
      entity.label = range.name;
    } else if (isSemanticGeneralization(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      entity.iri = next.iri;
      // Update generalization information.
      this.updateGeneralization(model, previous as any, next);
    } else if (isProfileClass(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      entity.iri = next.iri;
      entity.label = next.name ?? {};
      // Update profile of information.
      this.updateProfile(
        model, next.id, (previous as any).profiling, next.profiling);
    } else if (isProfileRelationship(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      const [, range] = selectDomainAndRange(next.ends);
      entity.iri = range.iri;
      entity.label = range.name ?? {};
      // Update profile of information.
      const [, previousRange] = selectDomainAndRange((previous as any).ends);
      this.updateProfile(
        model, next.id, (previousRange as any).profiling, range.profiling);
    } else if (isProfileGeneralization(next)) {
      const entity = this.getOrCreateCatalogEntity(next.id, model, next);
      entity.iri = next.iri;
      // Update generalization of information.
      this.updateGeneralization(model, previous as any, next);
    }
    // We need to cast to any here as VisualEntity is using identifier not id.
    else if (isVisualNode(next as any)) {
      // No action.
    } else if (isVisualRelationship(next as any)) {
      // No action.
    } else if (isModelVisualInformation(next as any)) {
      const visual = next as unknown as VisualModelInformation;
      const visualModel = this.getOrCreateVisualModelData(model);
      if (visual.representedModel !== null && visual.color !== null) {
        visualModel.colors[visual.representedModel] = visual.color;
      }
    }
  }

  private updateSemanticModel(
    model: ModelIdentifier, update: (value: SemanticModelData) => void,
  ) {
    const value = this.semanticModels.get(model);
    if (value === undefined) {
      return;
    }
    update(value);
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
    model: ModelIdentifier,
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
    if (isSemanticModelEntity(previous)) {
      this.removeSemanticModel(model);
    } else if (isExternalSemanticModelEntity(previous)) {
      this.removeSemanticModel(model);
    } else if (isPimStoreModelEntity(previous)) {
      this.removeSemanticModel(model);
    } else if (isVisualModelEntity(previous)) {
      this.visualModels.delete(model);
    } else if (previous.type.includes("entity-model-type")) {
      // Contains information about the visual model see ModelEntity.
      console.warn("  Ignored remove on \"entity-model-type\".");
    } else if (isSemanticClass(previous)) {
      this.entities.delete(previous.id);
    } else if (isSemanticRelationship(previous)) {
      this.entities.delete(previous.id);
    } else if (isSemanticGeneralization(previous)) {
      this.entities.delete(previous.id);
    } else if (isProfileClass(previous)) {
      this.entities.delete(previous.id);
    } else if (isProfileRelationship(previous)) {
      this.entities.delete(previous.id);
    } else if (isProfileGeneralization(previous)) {
      this.entities.delete(previous.id);
    }
    // We need to cast to any here as VisualEntity is using identifier not id.
    else if (isVisualNode(previous as any)) {
      const typed = previous as unknown as VisualNode;
      const entity = this.entities.get(typed.representedEntity);
      if (entity !== undefined) {
        this.removeVisualRepresentation(entity, model, typed.identifier);
      }
    } else if (isVisualRelationship(previous as any)) {
      const typed = previous as unknown as VisualRelationship;
      const entity = this.entities.get(typed.representedRelationship);
      if (entity !== undefined) {
        this.removeVisualRepresentation(entity, model, typed.identifier);
      }
    } else if (isModelVisualInformation(previous as any)) {
      const typed = previous as unknown as VisualModelInformation;
      const visualModel = this.visualModels.get(typed.representedModel);
      if (visualModel !== undefined) {
        delete visualModel.colors[typed.representedModel];
      }
    }
  }

  private removeSemanticModel(model: ModelIdentifier) {
    // Remove from a semantic list.
    this.semanticModels.delete(model);
    // TODO This should not be needed once we properly delete all model entities.
    // Remove visual information from all models.
    this.visualModels.values().forEach(visualModel => {
      delete visualModel.colors[model];
    });
  }

  private removeVisualRepresentation(
    entity: CatalogEntity,
    visualModel: ModelIdentifier,
    visualIdentifier: EntityIdentifier,
  ): void {
    entity.visualEntities[visualModel] = [
      ...(entity.visualEntities[visualModel] ?? []),
      visualIdentifier,
    ];
    removeFromArray(visualIdentifier, entity.visualEntities[visualModel]);
  }

  onDependenciesDidChange(next: Entity): void {
    // No action here.
  }

  onDidUpdate() {
    this.onDidChangeCallback?.(this);
  };

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

export interface SemanticModelData {

  /**
   * We need this as this is how we connect the model to the entity.
   */
  metadataEntity: ModelIdentifier;

  model: ModelIdentifier;

  label: LanguageString;

  isReadOnly: boolean;

  isExternal: boolean;

}

/**
 * We use this to reference {@link CatalogEntity} that has not yet been created.
 */
interface PartialCatalogEntity {

  /**
   * If null the entity was created by referenced entities.
   * I.e. for example there is a profile or generalization ot this entity.
   */
  entity: Entity | null;

  identifier: EntityIdentifier;

  /**
   * For the partial we enable model to be null as we may not have the
   * reference ready yet.
   */
  model: ModelIdentifier | null;

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

  model: ModelIdentifier;

}

export interface VisualModelData {

  metadataEntity: EntityIdentifier | null;

  model: ModelIdentifier;

  label: LanguageString;

  colors: { [identifier: ModelIdentifier]: string };

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
