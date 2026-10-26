import {
  WritableVisualModel, WRITABLE_VISUAL_MODEL_TYPE,
} from "./writable-visual-model.ts";
import {
  VISUAL_MODEL_TYPE, VisualModelDataVersion, VisualModelListener,
} from "./visual-model.ts";
import {
  HexColor, isModelVisualInformation, isVisualDiagramNode, isVisualGroup,
  isVisualNode, isVisualProfileRelationship, isVisualRelationship,
  isVisualView, RepresentedEntityIdentifier, VISUAL_DIAGRAM_NODE_TYPE,
  VISUAL_GROUP_TYPE, VISUAL_MODEL_DATA_TYPE, VISUAL_NODE_TYPE,
  VISUAL_PROFILE_RELATIONSHIP_TYPE, VISUAL_RELATIONSHIP_TYPE,
  VISUAL_VIEW_TYPE, VisualDiagramNode, VisualEntity, VisualGroup,
  VisualModelData, VisualNode, VisualProfileRelationship,
  VisualRelationship, VisualView
} from "./concepts/index.ts";
import { addToMapArray, removeFromMapArray } from "@dataspecer/utilities";
import { ModelIdentifier } from "@dataspecer/core/model";
import { Entity, EntityIdentifier } from "@dataspecer/core/entity-model";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import {
  isVisualModelSerializationV0, isVisualModelSerializationV1,
  isVisualModelSerializationV2, visualModelSerializationV0ToV2,
  visualModelSerializationV1ToV2,
  VisualModelSerializationV2,
} from "./serialization/index.ts";

export class DefaultVisualModel implements WritableVisualModel {

  private identifier: ModelIdentifier;

  private observers: VisualModelListener[] = [];

  /**
   * Map of all visual entities in the {@link model}.
   */
  private entities: Map<EntityIdentifier, VisualEntity> = new Map();

  /**
   * Cached mapping from represented to entity identifiers.
   */
  private representedToEntity:
    Map<RepresentedEntityIdentifier, EntityIdentifier[]> = new Map();

  /**
   * Map from model identifier to the model data.
   */
  private models: Map<string, VisualModelData> = new Map();

  /**
   * When model is loaded version of the source data is saved here.
   * This allows for additional migration on higher level.
   */
  private sourceDataVersion: VisualModelDataVersion
    = VisualModelDataVersion.VERSION_1;

  /**
   * Cached visual view identifier or null when there is no such entity.
   */
  private visualViewIdentifier: string | null = null;

  constructor(identifier: ModelIdentifier) {
    this.identifier = identifier;
  }

  getTypes(): string[] {
    return [VISUAL_MODEL_TYPE, WRITABLE_VISUAL_MODEL_TYPE];
  }

  getId(): string {
    return this.identifier;
  }

  getIdentifier(): string {
    return this.identifier;
  }

  getVisualEntity(identifier: EntityIdentifier): VisualEntity | null {
    return this.entities.get(identifier) ?? null;
  }

  getVisualEntitiesForRepresented(
    represented: RepresentedEntityIdentifier,
  ): VisualEntity[] {
    const identifiers = this.representedToEntity.get(represented);
    if (identifiers === undefined) {
      return [];
    }
    const visualEntities = identifiers
      .map(identifier => this.getVisualEntity(identifier))
      .filter(visualEntity => visualEntity !== null);
    return visualEntities;
  }

  hasVisualEntityForRepresented(
    represented: RepresentedEntityIdentifier,
  ): boolean {
    const identifiers = this.representedToEntity.get(represented);
    return identifiers !== undefined && identifiers.length > 0;
  }

  /**
   * Return all entities from the visual model.
   */
  getVisualEntities(): Map<EntityIdentifier, VisualEntity> {
    // Create ad return a copy of the entities.
    const result = new Map<EntityIdentifier, VisualEntity>();
    for (const [identifier, entity] of this.entities) {
      result.set(identifier, entity);
    }
    return result;
  }

  subscribeToChanges(listener: VisualModelListener): () => void {
    this.observers.push(listener);
    // Return callback to remove the listener.
    return () => {
      this.observers = this.observers.filter(item => item !== listener);
    };
  }

  getModelColor(identifier: string): HexColor | null {
    return this.models.get(identifier)?.color ?? null;
  }

  getModelsData(): Map<string, VisualModelData> {
    return new Map(this.models);
  }

  getInitialModelVersion(): VisualModelDataVersion {
    return this.sourceDataVersion;
  }

  getLabel(): LanguageString | null {
    const entity = this.getEntitySync(modelEntityIdentifier(this.identifier));
    if (entity === null) {
      return null;
    }
    const modelEntity = entity as ModelEntity;
    return modelEntity.label;
  }

  private getEntitySync(identifier: EntityIdentifier): Entity | null {
    return this.entities.get(identifier) ?? null;
  }

  setLabel(label: LanguageString | null): void {
    const id = modelEntityIdentifier(this.identifier);
    if (this.getEntitySync(id) === null) {
      // Create model entity.
      const modelEntity: NewEntity<ModelEntity> = {
        type: [VISUAL_MODEL_ENTITY_TYPE],
        label,
      };
      this.createEntity(modelEntity, id);
    } else {
      // Update.
      const change: ChangeEntity<ModelEntity> = {
        label: label
      };
      this.updateVisualEntity(id, change);
    }
  }

  //
  // Operation implementation section
  //

  addVisualNode(entity: Omit<VisualNode, "id" | "type">): string {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    return this.createEntity({
      ...entity,
      type: [VISUAL_NODE_TYPE],
    });
  }

  addVisualDiagramNode(
    entity: Omit<VisualDiagramNode, "id" | "type">,
  ): string {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    return this.createEntity({
      ...entity,
      type: [VISUAL_DIAGRAM_NODE_TYPE],
    });
  }

  addVisualRelationship(
    entity: Omit<VisualRelationship, "id" | "type">,
  ): string {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    return this.createEntity({
      ...entity,
      type: [VISUAL_RELATIONSHIP_TYPE],
    });
  }

  addVisualProfileRelationship(
    entity: Omit<VisualProfileRelationship, "id" | "type">,
  ): string {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    return this.createEntity({
      ...entity,
      type: [VISUAL_PROFILE_RELATIONSHIP_TYPE],
    });
  }

  addVisualGroup(
    entity: Omit<VisualGroup, "id" | "type">,
  ): string {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    return this.createEntity({
      ...entity,
      type: [VISUAL_GROUP_TYPE],
    });
  }

  updateVisualEntity<T extends VisualEntity>(
    identifier: EntityIdentifier,
    entity: Partial<Omit<T, "id" | "type">>,
  ): void {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    this.changeEntity(identifier, entity);
  }

  deleteVisualEntity(identifier: EntityIdentifier): void {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    this.deleteEntity(identifier);
  }

  setModelColor(identifier: string, color: HexColor): void {
    const entityIdentifier = this.models.get(identifier)?.id;
    if (entityIdentifier === undefined) {
      // We need to create new model entity.
      this.createModelEntity(identifier, color);
      return;
    }
    const entity = this.getEntitySync(entityIdentifier);
    if (entity === null) {
      // We need to create new model entity.
      this.createModelEntity(identifier, color);
      return;
    }
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    this.changeEntity(entityIdentifier, { color });
  }

  private createModelEntity(model: string, color: HexColor): void {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    // The same way to create a ModelVisualInformation is used in the
    // deserializeModelV0 method!
    const entity: NewEntity<VisualModelData> = {
      type: [VISUAL_MODEL_DATA_TYPE],
      representedModel: model,
      color
    };
    this.createEntity(entity);
  }

  deleteModelColor(identifier: string): void {
    // There is only color, so we delete the entity.
    this.deleteModelData(identifier);
  }

  deleteModelData(identifier: string): void {
    // We need to get entity identifier.
    const entityIdentifier = this.models.get(identifier)?.id;
    if (entityIdentifier === undefined) {
      return;
    }
    // Now we delete the entity.
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    this.deleteEntity(entityIdentifier);
  }

  setView(view: Omit<VisualView, "identifier" | "type">): void {
    if (this.visualViewIdentifier === null) {
      this.visualViewIdentifier = this.createEntity({
        ...view,
        type: [VISUAL_VIEW_TYPE],
      });
    } else {
      this.changeEntity(this.visualViewIdentifier, {
        ...view,
        type: [VISUAL_VIEW_TYPE],
      });
    }
  }

  //
  // Entity update operations.
  //

  private createEntity(
    entity: NewEntity<Entity>,
    id: EntityIdentifier | undefined = undefined,
  ): string {
    if (id === undefined) {
      id = createIdentifier();
    }
    this.entitiesDidChange([{ ...entity, id }], [], []);
    return id;
  }

  private changeEntity(
    id: EntityIdentifier, entity: ChangeEntity<Entity>,
  ): void {
    const previous = this.entities.get(id);
    if (previous === undefined) {
      console.warn("Update called for non-existing entity.",
        { id, entity, available: this.entities.keys() });
      return;
    }
    this.entitiesDidChange([], [
      { ...previous, ...entity, id }
    ], []);
  }

  private deleteEntity(id: EntityIdentifier): void {
    this.entitiesDidChange([], [], [id]);
  }


  /**
   * Called on change in entities.
   * The local entities field has been already modified.
   */
  private entitiesDidChange(
    created: Entity[], changed: Entity[], removed: string[],
  ): void {
    created.forEach(entity => {
      this.entities.set(entity.id, entity);
      this.onEntityDidCreate(entity);
      this.notifyObserversOnEntityChange(null, entity);
    });
    changed.forEach(entity => {
      const previous = this.entities.get(entity.id)!;
      this.entities.set(entity.id, entity);
      this.onEntityDidChange(previous, entity)
      this.notifyObserversOnEntityChange(previous, entity);
    });
    removed.forEach(id => {
      const previous = this.entities.get(id);
      if (previous === undefined) {
        return;
      }
      this.entities.delete(id);
      this.onEntityDidRemoved(previous);
      this.notifyObserversOnEntityChange(previous, null);
    });
  }

  private onEntityDidCreate(entity: Entity) {
    if (isVisualDiagramNode(entity)) {
      addToMapArray(
        entity.representedVisualModel, entity.id,
        this.representedToEntity);
    }
    if (isVisualNode(entity)) {
      addToMapArray(
        entity.representedEntity, entity.id,
        this.representedToEntity);
    }
    if (isVisualRelationship(entity)) {
      addToMapArray(
        entity.representedRelationship, entity.id,
        this.representedToEntity);
    }
    if (isModelVisualInformation(entity)) {
      this.models.set(entity.representedModel, entity);
      this.notifyObserversOnModelChange(null, entity);
    }
    if (isVisualView(entity)) {
      this.visualViewIdentifier = entity.id;
    }
  }

  private notifyObserversOnEntityChange(
    previous: VisualEntity | null, next: VisualEntity | null,
  ): void {
    this.observers.forEach(observer =>
      observer.visualEntitiesDidChange([{ previous, next }]));
  }

  private notifyObserversOnModelChange(
    previous: VisualModelData | null,
    next: VisualModelData | null,
  ) {
    // We know that at leas one of then is not null, unfortunately TS
    // is not capable of detecting that.
    const modelIdentifier =
      (previous?.representedModel ?? next?.representedModel) as string;
    const color = next?.color ?? null;
    this.observers.forEach(observer =>
      observer.modelColorDidChange(modelIdentifier, color));
  }

  private onEntityDidChange(previous: Entity, entity: Entity) {
    if (isModelVisualInformation(previous) && isModelVisualInformation(entity)) {
      this.models.set(entity.representedModel, entity);
      this.notifyObserversOnModelChange(previous, entity);
    }
    if (isVisualView(entity)) {
      this.visualViewIdentifier = entity.id;
    }
  }

  private onEntityDidRemoved(previous: Entity) {
    const id = previous.id;
    // Notify listeners.
    if (isVisualDiagramNode(previous)) {
      removeFromMapArray(
        this.representedToEntity, previous.representedVisualModel, id);
    }
    if (isVisualNode(previous)) {
      removeFromMapArray(
        this.representedToEntity, previous.representedEntity, id);
    }
    if (isVisualRelationship(previous)) {
      removeFromMapArray(
        this.representedToEntity, previous.representedRelationship, id);
    }
    if (isModelVisualInformation(previous)) {
      // We also need to delete from model.
      this.models.delete(previous.representedModel);
      // This meas change in color.
      this.notifyObserversOnModelChange(previous, null);
    }
    if (isVisualView(previous)) {
      this.visualViewIdentifier = null;
    }
  }

  //
  // Serialization
  //

  serializeModel(): object {
    const serialization: VisualModelSerializationV2 = {
      identifier: this.identifier,
      version: 2,
      type: "http://dataspecer.com/resources/local/visual-model",
      entities: [...this.entities.values()],
    };
    return serialization;
  }

  deserializeModel(value: object): this {
    let entities: VisualEntity[] = [];
    if (isVisualModelSerializationV0(value)) {
      this.sourceDataVersion = VisualModelDataVersion.VERSION_0;
      const v1 = visualModelSerializationV0ToV2(value);
      const v2 = visualModelSerializationV1ToV2(v1);
      entities = v2.entities;
    } else if (isVisualModelSerializationV1(value)) {
      this.sourceDataVersion = VisualModelDataVersion.VERSION_1;
      const v2 = visualModelSerializationV1ToV2(value);
      entities = v2.entities;
    } else if (isVisualModelSerializationV2(value)) {
      entities = value.entities;
    } else {
      throw new Error(`Unsupported serialization of visual model.`);
    }
    // Load the entities.
    this.entities = new Map();
    // Load from entities by just adding one entity at a time.
    for (const entity of entities) {
      this.entities.set(entity.id, entity);
      this.onEntityDidCreate(entity);
    }
    return this;
  }

}

type NewEntity<T extends Entity> = Omit<T, "id">;

type ChangeEntity<T extends Entity> = Partial<Omit<T, "id" | "type">>;

/**
 * @returns New entity identifier.
 */
const createIdentifier = () => (Math.random() + 1).toString(36).substring(7);

/**
 * @returns Identifier of the entity inside the model used to store model information.
 */
const modelEntityIdentifier = (identifier: string) => {
  return identifier + "-model-metadata-entity";
};

/**
 * Contains data about the model.
 */
export interface ModelEntity extends Entity {

  label: LanguageString | null;

}

export const VISUAL_MODEL_ENTITY_TYPE = "entity-model-type";

