import { Entity, EntityIdentifier } from "./entity.ts";
import { EntityModel, ModelIdentifier } from "./entity-model.ts";
import { LabeledModel, LabeledModelType, LanguageString } from "./labeled-model.ts";
import { SynchronousEntityModel, SynchronousEntityModelType } from "./synchronous-entity-model.ts";
import { LegacyModel } from "./legacy-model.ts";
import { EntityEventListener, ObservableEntityModel, UnsubscribeCallback, ObservableEntityModelType } from "./observable-entity-model.ts";
import { ChangeEntity, NewEntity } from "./writable-entity-model.ts";
import { SynchronousWritableEntityModel, SynchronousWritableEntityModelType } from "./on-premise-writable-entity-model.ts";
import { SerializableModel, SerializableModelType } from "./serializable-model.ts";

export interface DefaultEntityModelType extends EntityModel, LabeledModel, SynchronousEntityModel, SynchronousWritableEntityModel, ObservableEntityModel, SerializableModel, LegacyModel { }

/**
 * @deprecated We should introduce a factory class to create entity model based on package data
 */
export function createDefaultEntityModel(type: string, identifier?: ModelIdentifier): DefaultEntityModelType {
  return new DefaultEntityModel(type, identifier ?? createIdentifier());
}

const VERSION = 1;

class DefaultEntityModel implements DefaultEntityModelType {

  protected identifier: ModelIdentifier;

  protected type: string;

  protected entities: Map<string, Entity>;

  protected listeners: EntityEventListener[];

  constructor(type: string, identifier: ModelIdentifier) {
    this.identifier = identifier;
    this.type = type;
    this.entities = new Map<string, Entity>();
    this.listeners = [];
  }

  getIdentifier(): ModelIdentifier {
    return this.identifier;
  }

  getEntity(identifier: string): Promise<Entity | null> {
    return Promise.resolve(this.getEntitySync(identifier));
  }

  getTypes(): string[] {
    return [LabeledModelType, SynchronousEntityModelType, SynchronousWritableEntityModelType, ObservableEntityModelType, SerializableModelType]
  }

  getLabel(): { [language: string]: string; } | null {
    const entity = this.getEntitySync(modelEntityIdentifier(this.identifier));
    if (entity === null) {
      return null;
    }
    const modelEntity = entity as ModelEntity;
    return modelEntity.label;
  }

  setLabel(label: { [language: string]: string; } | null): void {
    const identifier = modelEntityIdentifier(this.identifier);
    if (this.getEntitySync(identifier) === null) {
      // Create model entity.
      const modelEntity : ModelEntity = {
        identifier,
        type: [ModelEntityType],
        label,
      };
      this.change([modelEntity], {}, []);
    } else {
      // Update.
      const change: ChangeEntity<ModelEntity> = {
        label: label
      };
      this.change([], { [identifier]: change, }, []);
    }
  }

  /**
   * Perform a change to the stored entities.
   *
   * @param create
   * @param change
   * @param remove
   */
  protected change<T extends Entity>(create: T[], change: Record<string, ChangeEntity<T>>, remove: string[]): void {
    // Create.
    const created: Entity[] = []
    create.forEach(entity => {
      this.entities.set(entity.identifier, entity);
      created.push(entity);
    });
    // Update.
    const changed: Entity[] = [];
    for (const [identifier, entity] of Object.entries(change)) {
      const oldEntity = this.entities.get(identifier);
      if (oldEntity === undefined) {
        console.warn("Update called for non-existing entity.", { identifier, entity, available: this.entities.keys() });
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
    // Notify.
    this.listeners.forEach(listener => listener.entitiesDidChange(created, changed, removed));
  }

  createEntitySync<T extends Entity>(entity: NewEntity<T>): string {
    const identifier = createIdentifier();
    this.change([{ ...entity, identifier }], {}, []);
    return identifier;
  }

  changeEntitySync<T extends Entity>(identifier: EntityIdentifier, entity: ChangeEntity<T>): void {
    this.change([], {
      [identifier]: entity,
    }, []);
  }

  deleteEntitySync(identifier: EntityIdentifier): void {
    this.change([], {}, [identifier]);
  }

  initialize(): Promise<void> {
    // There is no implementation here as all the data
    // are loaded using LegacyModel interface.
    return Promise.resolve();
  }

  getEntitySync(identifier: EntityIdentifier): Entity | null {
    return this.entities.get(identifier) ?? null;
  }

  getEntitiesSync(): Entity[] {
    return [...this.entities.values()];
  }

  subscribeToChanges(listener: EntityEventListener): UnsubscribeCallback {
    this.listeners.push(listener);
    // Return callback to remove the listener.
    return () => this.listeners = this.listeners.filter(item => item !== listener);
  }

  serializeModelToApiJsonObject(): object {
    return {
      identifier: this.identifier,
      version: VERSION,
      type: this.type,
      entities: [...this.entities.values()],
    }
  }

  getId(): string {
    return this.getIdentifier();
  }

  serializeModel(): object {
    return this.serializeModelToApiJsonObject();
  }

  deserializeModel(value: object): this {
    const payload = value as any;
    if (this.type !== payload.type) {
      throw new Error(`Models do not have same types, actual: '${this.type}', expected: '${payload.type}'.`);
    }
    // Should we need to deal with migration, this is the place to do so.
    this.entities = new Map();
    for (const entity of payload.entities) {
      this.entities.set(entity.identifier, entity);
    }
    return this;
  }

}

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
interface ModelEntity extends Entity {

  label: LanguageString | null;

}

const ModelEntityType = "entity-model-type";
