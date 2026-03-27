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
  VisualModelData as VisualModelInformation
} from "@dataspecer/visual-model";
import { removeFromArray } from "../utilities/functional";

export class CatalogTracker implements Tracker {

  readonly semanticModels: Map<ModelIdentifier, SemanticModelData> = new Map();

  readonly entities: Map<EntityIdentifier, CatalogEntity> = new Map();

  readonly visualModels: Map<ModelIdentifier, VisualModelData> = new Map();

  /**
   * Call back to invoke if there is a change in the state.
   */
  private readonly onDidChangeCallback: (tracker: CatalogTracker) => void;

  readonly defaultBackgroundColor: string;

  constructor(
    onDidChangeCallback: (tracker: CatalogTracker) => void,
    defaultBackgroundColor: string,
  ) {
    this.onDidChangeCallback = onDidChangeCallback;
    this.defaultBackgroundColor = defaultBackgroundColor;
  }

  dependencies(entity: Entity): string[] {
    if (isSemanticGeneralization(entity)) {
      return [entity.child, entity.parent];
    }
    if (isProfileClass(entity)) {
      return entity.profiling;
    }
    if (isProfileRelationship(entity)) {
      return entity.ends
        .map(end => ([...end.profiling, end.concept]))
        .flat();
    }
    if (isProfileGeneralization(entity)) {
      return [entity.child, entity.parent];
    }
    return [];
  }

  onEntityDidCreate(model: ModelIdentifier, next: Entity): void {
    // A single entity can have multiple types, here we just
    // use the data from the first type.
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
      const entity = this.getOrCreateCatalogEntity(model, next.id, next);
      entity.iri = next.iri;
      entity.label = next.name;
    } else if (isSemanticRelationship(next)) {
      const entity = this.getOrCreateCatalogEntity(model, next.id, next);
      const [_, range] = selectDomainAndRange(next.ends);
      entity.iri = range.iri;
      entity.label = range.name;
    } else if (isSemanticGeneralization(next)) {
      const entity = this.getOrCreateCatalogEntity(model, next.id, next);
      entity.iri = next.iri;
    } else if (isProfileClass(next)) {
      const entity = this.getOrCreateCatalogEntity(model, next.id, next);
      entity.iri = next.iri;
      entity.label = next.name ?? {};
    } else if (isProfileRelationship(next)) {
      const entity = this.getOrCreateCatalogEntity(model, next.id, next);
      const [_, range] = selectDomainAndRange(next.ends);
      entity.iri = range.iri;
      entity.label = range.name ?? {};
    } else if (isProfileGeneralization(next)) {
      const entity = this.getOrCreateCatalogEntity(model, next.id, next);
      entity.iri = next.iri;
    }
    // We need to cast to any here as VisualEntity is using identifier not id.
    else if (isVisualNode(next as any)) {
      const typed = next as unknown as VisualNode;
      const entity = this.getOrCreateCatalogEntity(
        typed.model, typed.representedEntity, next);
      this.addVisualRepresentation(entity, model, typed.identifier);
    } else if (isVisualRelationship(next as any)) {
      const typed = next as unknown as VisualRelationship;
      const entity = this.getOrCreateCatalogEntity(
        typed.model, typed.representedRelationship, next);
      this.addVisualRepresentation(entity, model, typed.identifier);
    } else if (isModelVisualInformation(next as any)) {
      const typed = next as unknown as VisualModelInformation;
      const visualModel = this.getOrCreateVisualModelData(model);
      if (typed.representedModel !== null && typed.color !== null) {
        visualModel.colors[typed.representedModel] = typed.color;
      }
    }
  }

  private getOrCreateCatalogEntity(
    model: ModelIdentifier,
    identifier: EntityIdentifier,
    entity: Entity | null,
  ): CatalogEntity {
    let result = this.entities.get(identifier);
    if (result === undefined) {
      result = {
        entity: entity,
        identifier: identifier,
        model: model,
        iri: null,
        label: {},
        profiledBy: [],
        generalizationOf: [],
        visualEntities: {},
      };
      this.entities.set(identifier, result);
    }
    return result;
  }

  private addVisualRepresentation(
    entity: CatalogEntity,
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
    if (isModelVisualInformation(next as any)) {
      const visual = next as unknown as VisualModelInformation;
      const visualModel = this.getOrCreateVisualModelData(model);
      if (visual.representedModel !== null && visual.color !== null) {
        visualModel.colors[visual.representedModel] = visual.color;
      }
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
    // console.log("catalog-tracker.dependencies-changed", { entity: next });
    if (isSemanticGeneralization(next)) {
      // TODO ...
      this.entities.get(next.parent)?.generalizationOf.push(next.child);
    } else if (isProfileClass(next)) {
      // TODO ...
      next.profiling
        .map(identifier => this.entities.get(identifier))
        .filter(entity => entity !== undefined)
        .forEach(entity => entity.profiledBy.push(next.id));
    } else if (isProfileRelationship(next)) {
      // TODO ...
      const [_, range] = selectDomainAndRange(next.ends);
      range.profiling
        .map(identifier => this.entities.get(identifier))
        .filter(entity => entity !== undefined)
        .forEach(entity => entity.profiledBy.push(next.id));
    } else if (isProfileGeneralization(next)) {
      // TODO ...
      this.entities.get(next.parent)?.generalizationOf.push(next.child);
    }
  }

  onDidUpdate() {
    this.onDidChangeCallback?.(this);
  };

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
      return this.defaultBackgroundColor;
    }
    const visual = this.visualModels.get(visualModel)
    if (visual === undefined) {
      return this.defaultBackgroundColor;
    }
    return visual.colors[model] ?? this.defaultBackgroundColor;
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

export interface CatalogEntity {

  /**
   * If null the entity was created by referenced entities.
   */
  entity: Entity | null;

  identifier: EntityIdentifier;

  model: ModelIdentifier;

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
