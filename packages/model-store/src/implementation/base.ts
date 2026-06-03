import type { Entity, EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { Model } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { diffEntities } from "../utilities.ts";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";

export const UNDO_OPERATION_TYPE = "undo" as const;

/**
 * An undo operation "cancels" specific transaction (a set of operations) in the
 * model. It can be used to implement undo/redo functionality by simply
 * canceling last non-canceled transactions an canceling undo operations to
 * perform redo.
 */
export interface UndoOperation extends Operation {
  type: typeof UNDO_OPERATION_TYPE;

  /**
   * Transaction ID that this undo cancels.
   */
  cancelTransactionId: string;
}

function isUndoOperation(operation: Operation): operation is UndoOperation {
  return operation.type === UNDO_OPERATION_TYPE;
}

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

  protected abstract loadInternal(): Promise<ModelState<BaseEntityType>>;

  async load(): Promise<void> {
    const oldEntities = this.state.entities;
    this.state = await this.loadInternal();
    const changes = diffEntities(oldEntities, this.state.entities);
    this.notifyAboutExternalChanges(changes);
  }

  protected abstract saveInternal(state: ModelState<BaseEntityType>): Promise<void>;

  async save(): Promise<void> {
    // Todo check for state changes
    this.saveInternal(this.state);
  }

  /**
   * Returns all entities in the model.
   * The returned object is immutable.
   */
  getAllEntities(): EntityRecord<BaseEntityType> {
    return this.state.entities;
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

  public applyOperations(transactionId: string, operations: Operation[]): ApplyOperationResult {
    // Perform snapshot if necessary
    const lastSnapshotTransactionId = this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].transactionId : null;
    if (lastSnapshotTransactionId !== transactionId) {
      this.snapshots.push({
        stateBefore: {
          entities: {...this.state.entities},  // We create copy to conserve the state
          operations: [...this.state.operations],
        },
        transactionId: transactionId,
      });
    }

    if (operations.some(isUndoOperation)) {
      // Handle UNDO
      if (operations.length > 1) {
        throw new Error("Undo operation must be applied separately from other operations!");
      }
      const undoOperation = operations[0] as UndoOperation;

      // Todo we trust that caller use undo operations in correct order.

      const snapshot = this.snapshots.find(snapshot => snapshot.transactionId === undoOperation.cancelTransactionId);

      if (!snapshot) {
        throw new Error(`Cannot find snapshot for transaction ID ${undoOperation.cancelTransactionId}`);
      }

      const previousEntities = {...this.state.entities};
      this.state.entities = {...snapshot.stateBefore.entities};

      return {
        transactionId,
        entityChanges: diffEntities(previousEntities, this.state.entities),
      };
    } else {
      const entities = {...this.state.entities};

      for (const operation of operations) {
        this.applyOperation(operation, entities);
      }

      const diff = diffEntities(this.state.entities, entities);
      this.state.entities = entities;

      return {
        transactionId,
        entityChanges: diff,
      };
    }
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
