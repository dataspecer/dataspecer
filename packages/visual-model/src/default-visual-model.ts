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

  getVisualEntities(): Map<EntityIdentifier, VisualEntity> {
    return new Map(this.entities);
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
      const modelEntity: ModelEntity = {
        id,
        type: [ModelEntityType],
        label,
      };
      this.change([modelEntity], {}, []);
    } else {
      // Update.
      const change: ChangeEntity<ModelEntity> = {
        label: label
      };
      this.change([], { [id]: change, }, []);
    }
  }

  //
  // Operation implementation section
  //

  addVisualNode(entity: Omit<VisualNode, "id" | "type">): string {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    return this.createEntitySync({
      ...entity,
      type: [VISUAL_NODE_TYPE],
    });
  }

  private createEntitySync<T extends Entity>(entity: NewEntity<T>): string {
    const id = createIdentifier();
    this.change([{ ...entity, id }], {}, []);
    return id;
  }

  addVisualDiagramNode(
    entity: Omit<VisualDiagramNode, "id" | "type">,
  ): string {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    return this.createEntitySync({
      ...entity,
      type: [VISUAL_DIAGRAM_NODE_TYPE],
    });
  }

  addVisualRelationship(
    entity: Omit<VisualRelationship, "id" | "type">,
  ): string {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    return this.createEntitySync({
      ...entity,
      type: [VISUAL_RELATIONSHIP_TYPE],
    });
  }

  addVisualProfileRelationship(
    entity: Omit<VisualProfileRelationship, "id" | "type">,
  ): string {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    return this.createEntitySync({
      ...entity,
      type: [VISUAL_PROFILE_RELATIONSHIP_TYPE],
    });
  }

  addVisualGroup(
    entity: Omit<VisualGroup, "id" | "type">,
  ): string {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    return this.createEntitySync({
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
    this.changeEntitySync(identifier, entity);
  }

  private changeEntitySync<T extends Entity>(
    identifier: EntityIdentifier, entity: ChangeEntity<T>,
  ): void {
    this.change([], { [identifier]: entity }, []);
  }

  /**
   * Perform a change to the stored entities.
   */
  private change<T extends Entity>(
    create: T[], change: Record<string, ChangeEntity<T>>, remove: string[],
  ): void {
    // Create.
    const created: Entity[] = []
    create.forEach(entity => {
      this.entities.set(entity.id, entity);
      created.push(entity);
    });
    // Update.
    const changed: Entity[] = [];
    for (const [identifier, entity] of Object.entries(change)) {
      const oldEntity = this.entities.get(identifier);
      if (oldEntity === undefined) {
        console.warn("Update called for non-existing entity.",
          { identifier, entity, available: this.entities.keys() });
        continue;
      }
      const newEntity: Entity = {
        ...oldEntity,
        ...entity,
        identifier,
      };
      this.entities.set(identifier, newEntity);
      changed.push(newEntity);
    }
    // Delete.
    const removed: string[] = [];
    remove.forEach(identifier => {
      if (this.entities.delete(identifier)) {
        removed.push(identifier);
      }
    });
    // Now let the event listener handle the change.
    this.entitiesDidChange(create, changed, removed);
  }

  deleteVisualEntity(identifier: EntityIdentifier): void {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    this.deleteEntitySync(identifier);
  }

  private deleteEntitySync(identifier: EntityIdentifier): void {
    this.change([], {}, [identifier]);
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
    this.changeEntitySync(entityIdentifier, { color });
  }

  private createModelEntity(model: string, color: HexColor): void {
    // This will trigger update in underlying model and invoke callback.
    // We react to changes using the callback.
    // The same way to create a ModelVisualInformation is used in the
    // deserializeModelV0 method!
    this.createEntitySync<VisualModelData>({
      type: [VISUAL_MODEL_DATA_TYPE],
      representedModel: model,
      color
    });
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
    this.deleteEntitySync(entityIdentifier);
  }

  setView(view: Omit<VisualView, "identifier" | "type">): void {
    if (this.visualViewIdentifier === null) {
      this.visualViewIdentifier = this.createEntitySync({
        ...view,
        type: [VISUAL_VIEW_TYPE],
      });
    } else {
      this.changeEntitySync(this.visualViewIdentifier, {
        ...view,
        type: [VISUAL_VIEW_TYPE],
      });
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
      this.onEntityDidCreate(entity);
    }
    return this;
  }


  //
  // Change propagation and notification.
  //

  private entitiesDidChange(created: Entity[], changed: Entity[], removed: string[]): void {
    created.forEach(entity => this.onEntityDidCreate(entity));
    changed.forEach(entity => this.onEntityDidChange(entity));
    removed.forEach(entity => this.onEntityDidRemoved(entity));
  }

  private onEntityDidCreate(entity: Entity) {
    if (isVisualDiagramNode(entity)) {
      this.entities.set(entity.id, entity);
      addToMapArray(
        entity.representedVisualModel, entity.id,
        this.representedToEntity);
      this.notifyObserversOnEntityChangeOrDelete(null, entity);
    }
    if (isVisualNode(entity)) {
      this.entities.set(entity.id, entity);
      addToMapArray(
        entity.representedEntity, entity.id,
        this.representedToEntity);
      this.notifyObserversOnEntityChangeOrDelete(null, entity);
    }
    if (isVisualRelationship(entity)) {
      this.entities.set(entity.id, entity);
      addToMapArray(
        entity.representedRelationship, entity.id,
        this.representedToEntity);
      this.notifyObserversOnEntityChangeOrDelete(null, entity);
    }
    if (isVisualGroup(entity)) {
      this.entities.set(entity.id, entity);
      this.notifyObserversOnEntityChangeOrDelete(null, entity);
    }
    if (isModelVisualInformation(entity)) {
      this.entities.set(entity.id, entity);
      this.models.set(entity.representedModel, entity);
      this.notifyObserversOnModelChange(null, entity);
      this.notifyObserversOnEntityChangeOrDelete(null, entity);
    }
    if (isVisualProfileRelationship(entity)) {
      this.entities.set(entity.id, entity);
      // There is no primary representation for this one.
      this.notifyObserversOnEntityChangeOrDelete(null, entity);
    }
    if (isVisualView(entity)) {
      this.entities.set(entity.id, entity);
      this.visualViewIdentifier = entity.id;
    }
  }

  private notifyObserversOnEntityChangeOrDelete(
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

  private onEntityDidChange(entity: Entity) {
    const previous = this.entities.get(entity.id);
    if (isVisualDiagramNode(entity)) {
      this.entities.set(entity.id, entity);
      this.notifyObserversOnEntityChangeOrDelete(
        previous as VisualEntity, entity);
    }
    if (isVisualNode(entity)) {
      this.entities.set(entity.id, entity);
      this.notifyObserversOnEntityChangeOrDelete(
        previous as VisualEntity, entity);
    }
    if (isVisualRelationship(entity)) {
      this.entities.set(entity.id, entity);
      this.notifyObserversOnEntityChangeOrDelete(
        previous as VisualEntity, entity);
    }
    if (isVisualGroup(entity)) {
      this.entities.set(entity.id, entity);
      this.notifyObserversOnEntityChangeOrDelete(
        previous as VisualEntity, entity);
    }
    if (isModelVisualInformation(entity)) {
      this.entities.set(entity.id, entity);
      this.models.set(entity.representedModel, entity);
      this.notifyObserversOnModelChange(
        previous as VisualModelData, entity);
      this.notifyObserversOnEntityChangeOrDelete(
        previous as VisualEntity, entity);
    }
    if (isVisualProfileRelationship(entity)) {
      this.entities.set(entity.id, entity);
      this.notifyObserversOnEntityChangeOrDelete(
        previous as VisualEntity, entity);
    }
    if (isVisualView(entity)) {
      this.entities.set(entity.id, entity);
      this.visualViewIdentifier = entity.id;
      this.notifyObserversOnEntityChangeOrDelete(
        previous as VisualEntity, entity);
    }
  }

  private onEntityDidRemoved(identifier: string) {
    const previous = this.entities.get(identifier);
    if (previous === undefined) {
      // We have no previous information about the entity,
      // so we ignore the update.
      return;
    }
    // Remove the entity from internal structures.
    this.entities.delete(identifier);
    // Notify listeners.
    if (isVisualDiagramNode(previous)) {
      removeFromMapArray(
        this.representedToEntity, previous.representedVisualModel, identifier);
      this.notifyObserversOnEntityChangeOrDelete(previous, null);
    }
    if (isVisualNode(previous)) {
      removeFromMapArray(
        this.representedToEntity, previous.representedEntity, identifier);
      this.notifyObserversOnEntityChangeOrDelete(previous, null);
    }
    if (isVisualRelationship(previous)) {
      removeFromMapArray(
        this.representedToEntity, previous.representedRelationship, identifier);
      this.notifyObserversOnEntityChangeOrDelete(previous, null);
    }
    if (isVisualGroup(previous)) {
      this.notifyObserversOnEntityChangeOrDelete(previous, null);
    }
    if (isModelVisualInformation(previous)) {
      // We also need to delete from model.
      this.models.delete(previous.representedModel);
      // This meas change in color.
      this.notifyObserversOnModelChange(previous, null);
      this.notifyObserversOnEntityChangeOrDelete(previous, null);
    }
    if (isVisualProfileRelationship(previous)) {
      this.notifyObserversOnEntityChangeOrDelete(previous, null);
    }
    if (isVisualView(previous)) {
      this.visualViewIdentifier = null;
    }
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

export const ModelEntityType = "entity-model-type";

