import { DefaultWritableEntityModel } from "./entity-model/default-entity-model/default-writable-entity-model.ts";
import type { EntityModel, EntitySet } from "./entity-model/entity-model.ts";
import type { Entity } from "./entity-model/entity.ts";
import type { WritableEntityModel } from "./entity-model/writable-entity-model.ts";
import type { Commit, ModelStore, ModelStoreChangeEvent, OperationOnModel, WritableModelStore } from "./interfaces.ts";
import { deepEqual } from "./utilities.ts";

/**
 * EntityModel that is managed by the model store.
 */
export class ModelInModelStore extends DefaultWritableEntityModel {
  constructor(id: string) {
    super(id);
    const mainEntity: Entity = {
      identifier: id,
      type: ["main-entity"],
    };
    this.changeEntitiesAndNotify([mainEntity], []);
  }

  /**
   * Updates the whole model.
   */
  forceUpdateEntities(entities: EntitySet): void {
    const toUpdate: Entity[] = [];
    for (const entity of Object.values(entities)) {
      if (!deepEqual(this.getEntity(entity.identifier), entity)) {
        toUpdate.push(entity);
      }
    }
    const toRemove: string[] = [...new Set(this.entities.keys()).difference(new Set(Object.keys(entities)))];
    this.changeEntitiesAndNotify(toUpdate, toRemove);
  }
}

export class LegacyModelStore implements ModelStore, WritableModelStore {
  protected models: Map<string, ModelInModelStore> = new Map();
  protected changeListeners: Set<(event: ModelStoreChangeEvent) => void> = new Set();

  /**
   * Adds new model to the store from entity set. modelId must be unique and
   * must match entity in the model. If the model already exists, it will be
   * completely replaced.
   *
   * Some models may not have main entity, but have some metadata outside of the
   * entity list. In this case, please transform the metadata to the main
   * entity.
   */
  injectModelFromLegacySource(model: EntitySet, modelId: string): void {
    const internalModel = this.models.get(modelId) ?? new ModelInModelStore(modelId);
    internalModel.forceUpdateEntities(model);
  }

  getModel(id: string): EntityModel & WritableEntityModel {
    let model = this.models.get(id);
    if (model) {
      return model;
    }

    // We need to register the model
    model = new ModelInModelStore(id);
    this.models.set(id, model);

    model.subscribeToChanges((changes) => {
      this.notifyChanges({ [id]: changes });
    });

    // Todo we should figure out how to unregister models.

    return model;
  }

  protected notifyChanges(changes: ModelStoreChangeEvent): void {
    for (const listener of this.changeListeners) {
      listener(changes);
    }
  }

  subscribeToChanges(listener: (event: ModelStoreChangeEvent) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  dispatch(operations: OperationOnModel[], commit?: Commit): void {
    // For now, we will ignore commit
    commit;

    // Todo now we trigger callback for each model separately which is not ideal.

    const groupedOperations = Object.groupBy(operations, (operation) => operation.forModelId);
    for (const [modelId, operationsForModel] of Object.entries(groupedOperations)) {
      const model = this.getModel(modelId);
      model.dispatch(operationsForModel!.map((operation) => operation.operation));
    }
  }
}
