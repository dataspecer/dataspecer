import type { Entity, EntityChange, EntityIdentifier, EntityRecord } from "@dataspecer/core/entity-model";
import { diffEntities } from "@dataspecer/core/entity-model";
import type { Model } from "@dataspecer/core/model";
import { isRemoveEntityOperation, isSetEntityOperation, isUpdateEntityOperation, type Operation } from "@dataspecer/core/operation";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";

/**
 * State of the model. Can be used for undo/redo operations and to keep track of changes.
 * Can be mutable.
 */
export interface ModelState<BaseEntityType extends Entity = Entity> {
  entities: EntityRecord<BaseEntityType>;
  operations: Operation[];
}

interface Snapshot<BaseEntityType extends Entity = Entity> {
  stateBefore: ModelState<BaseEntityType>;
  // todo maybe state after?
  transactionId: string | null;
}

/**
 * This is helper implementation for EntityModels that handles subscription,
 * undo/redo operations and other common logic.
 */
export abstract class BaseModelInModelStore<BaseEntityType extends Entity = Entity> implements Model, ModelInDefaultFrontendModelStore {
  id: string;

  private state: ModelState<BaseEntityType> = {
    entities: {},
    operations: [],
  };

  /**
   * For each transaction we will keep a snapshot of the model state.
   */
  private snapshots: Snapshot<BaseEntityType>[] = [];

  private externalChangesSubscribers: ((changes: EntityChange[]) => void)[] = [];

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Function to load the state from backend.
   */
  protected abstract loadInternal(): Promise<ModelState<BaseEntityType>>;

  /**
   * Hook for newly created models. Sets up any runtime state the model needs
   * and returns the operations that create the model's initial entities. The
   * default is no runtime state and no operations, i.e. an empty model.
   */
  protected createNewInternal(): Operation[] {
    return [];
  }

  /**
   * Initializes the model as freshly created (e.g. as a reaction to a
   * {@link CreateModelOperation} on the project model), without fetching
   * anything from the backend. The initial state is obtained by applying
   * operations (see {@link createNewInternal}) to an empty state under the
   * given transaction. The applied operations are returned so that the caller
   * can record them as part of that transaction. Marks the model dirty so that
   * it gets persisted on the next {@link save}.
   */
  createNew(transactionId: string): { operations: Operation[]; entityChanges: EntityChange[] } {
    this.initializeState({
      entities: {},
      operations: [],
    });
    const operations = this.createNewInternal();
    const { entityChanges } = this.applyOperations(transactionId, operations);
    return { operations, entityChanges };
  }

  async load(): Promise<void> {
    const oldEntities = this.state.entities;
    this.state = await this.loadInternal();
    const changes = diffEntities(oldEntities, this.state.entities);
    this.notifyAboutExternalChanges(changes);
  }

  /**
   * Synchronously sets the model state, bypassing any diffing/notification.
   * Intended to be used by {@link createNew} to set up the initial state of a
   * freshly created model.
   */
  protected initializeState(state: ModelState<BaseEntityType>): void {
    this.state = state;
  }

  /**
   * Returns all entities in the model.
   * The returned object is immutable.
   */
  getAllEntities(): EntityRecord<BaseEntityType> {
    return this.state.entities;
  }

  /**
   * Returns a single entity by id, or null if it does not exist in this model.
   */
  getEntity(id: EntityIdentifier): BaseEntityType | null {
    return this.state.entities[id] ?? null;
  }

  /**
   * Updates list of entities with the provided changes when the change is
   * asynchronous or external - not caused directly and synchronously by
   * applying operations in this model.
   */
  protected externalChange(changes: EntityChange[]): void {
    const newEntities = { ...this.state.entities };
    for (const change of changes) {
      if (change.next) {
        newEntities[change.next.id] = change.next as BaseEntityType;
      } else {
        delete newEntities[change.previous.id];
      }
    }
    this.state.entities = newEntities;

    this.notifyAboutExternalChanges(changes);
  }

  /**
   * Notifies subscribers about changes that did not happen during applying
   * operations.
   */
  protected notifyAboutExternalChanges(changes: EntityChange[]): void {
    for (const listener of this.externalChangesSubscribers) {
      listener(changes);
    }
  }

  /**
   * Method to be implemented by individual subclasses to execute their domain
   * logic.
   */
  protected abstract applyOperation(operation: Operation, mutableState: EntityRecord<BaseEntityType>): void;

  /**
   * Hook for subclasses to react to changes the model just made and report
   * additional ones. Called for every change caused by this model itself, no
   * matter whether it comes from applying operations or from reverting a
   * transaction.
   */
  protected onEntityChanges(changes: EntityChange[]): EntityChange[] {
    return changes;
  }

  /**
   * Remembers the current state as the state before the given transaction,
   * unless it is already remembered. This is what {@link revertTransaction}
   * restores.
   */
  private takeSnapshot(transactionId: string): void {
    const lastSnapshotTransactionId = this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].transactionId : null;
    if (lastSnapshotTransactionId === transactionId) {
      return;
    }
    this.snapshots.push({
      stateBefore: {
        entities: { ...this.state.entities }, // We create copy to conserve the state
        operations: [...this.state.operations],
      },
      transactionId: transactionId,
    });
  }

  public applyOperations(transactionId: string, operations: Operation[]): ApplyOperationResult {
    this.takeSnapshot(transactionId);

    const previousState = this.state.entities;
    this.state.entities = { ...this.state.entities };

    for (const operation of operations) {
      // todo: we allow running this low level operations on all models, is it correct?
      if (isSetEntityOperation(operation)) {
        const entity = operation.entity as BaseEntityType;
        this.state.entities[entity.id] = entity;
      } else if (isUpdateEntityOperation(operation)) {
        const update = operation.update;
        const entity = this.state.entities[update.id];
        // If entity does not exist, do nothing
        if (entity) {
          this.state.entities[update.id] = { ...entity, ...update };
        }
      } else if (isRemoveEntityOperation(operation)) {
        delete this.state.entities[operation.entityId];
      } else {
        this.applyOperation(operation, this.state.entities);
      }
    }

    return {
      transactionId,
      entityChanges: this.onEntityChanges(diffEntities(previousState, this.state.entities)),
    };
  }

  /**
   * Restores the state the model had before the given transaction, as part of
   * the transaction that performs the revert - so that the revert itself can
   * be reverted later (redo). Returns the resulting entity changes, or null
   * when the model has no state remembered for the reverted transaction,
   * meaning the transaction did not change this model.
   *
   * Only the state of the model is restored; the revert is recorded once for
   * the whole transaction by the caller, see the UndoOperation.
   */
  public revertTransaction(transactionId: string, revertedTransactionId: string): EntityChange[] | null {
    const snapshot = this.snapshots.find((snapshot) => snapshot.transactionId === revertedTransactionId);
    if (!snapshot) {
      return null;
    }

    this.takeSnapshot(transactionId);

    const previousEntities = this.state.entities;
    this.state.entities = { ...snapshot.stateBefore.entities };

    return this.onEntityChanges(diffEntities(previousEntities, this.state.entities));
  }

  /**
   * Subscribes to entity changes that are not caused by applying operations in this model.
   */
  subscribeForAsyncChanges(listener: (changes: EntityChange[]) => void): () => void {
    this.externalChangesSubscribers.push(listener);
    return () => {
      this.externalChangesSubscribers = this.externalChangesSubscribers.filter((l) => l !== listener);
    };
  }
}
