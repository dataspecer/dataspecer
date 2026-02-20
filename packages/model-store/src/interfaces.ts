import type { EntityModel, ObservableEntityModelChangeEvent } from "./entity-model/entity-model.ts";
import type { Operation } from "./entity-model/writable-entity-model.ts";

/**
 * Mapping from model id to the list of changes in the model.
 */
export type ModelStoreChangeEvent = Record<string, ObservableEntityModelChangeEvent>;

export interface ModelStore {
  /**
   * Returns single model by its id that is managed by the store.
   * If the model does not exist, an empty model is returned.
   */
  getModel(id: string): EntityModel;

  /**
   * Subscribes observer to all changes in the store.
   * @returns Unsubscribe function.
   */
  subscribeToChanges(listener: (event: ModelStoreChangeEvent) => void): () => void;
}

/**
 * Atomic operation that can be dispatched to the single model.
 */
export interface OperationOnModel {
  operation: Operation;
  forModelId: string;
}

/**
 * Describes a set of operations that were dispatched together.
 */
export interface Commit {
  id: string;
}

export interface WritableModelStore extends ModelStore {
  dispatch(operations: OperationOnModel[], commit?: Commit): void;
}

export interface UndoState {
  availableUndoCommits: Commit[];
  availableRedoCommits: Commit[];
}

export interface UndoRedoModelStore {
  undo(): void;
  redo(): void;

  /**
   * @returns Unsubscribe function.
   */
  subscribeToUndoRedoState(callback: (state: UndoState) => void): () => void;
}