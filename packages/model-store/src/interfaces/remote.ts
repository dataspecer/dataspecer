import type { EntityObservableModelStore } from "./observable.ts";
import type { UndoRedoModelStore } from "./undo-redo.ts";
import type { WritableModelStore } from "./writable.ts";

/**
 * The purpose of the remote model store is to provide a unified interface for
 * working with models for remote applications, such as frontend. Those
 * applications need transactions, change observation, undo/redo,
 * synchronization, etc.
 */
export interface RemoteModelStore extends WritableModelStore, EntityObservableModelStore, SimpleSyncRemoteModelStore, UndoRedoModelStore {
  getConnectionStatus(): ConnectionStatus;
  subscribeToConnectionStatus(update: (status: ConnectionStatus) => void): () => void;

  /**
   * Subscribes to be notified every time a transaction is fully applied, i.e.
   * after a transaction is committed, or after undo/redo. Useful for example
   * to trigger a save of the changed models.
   *
   * @returns Unsubscribe function.
   */
  subscribeToTransactionCommit(listener: () => void): () => void;
}

/**
 * Reports information about the state of synchronization with the backend.
 */
export interface ConnectionStatus {
  /**
   * List of transaction IDs that are not yet confirmed by the backend.
   */
  pendingTransactionIds: string[];
}

export interface SimpleSyncRemoteModelStore {
  /**
   * Saves the current state of the model to the backend by force overriding the
   * existing remote state.
   */
  saveByOverride(): Promise<void>;

  /**
   * Reloads the current state of the model store by force overriding the
   * existing local state.
   */
  loadByOverride(): Promise<void>;
}

/**
 * @todo this is just an idea of a model store that can perform synchronization
 *  by sending operations.
 */
export interface OperationSyncRemoteModelStore extends RemoteModelStore {
  /**
   * Applies new changes to the backend and synchronizes the local state.
   */
  saveByApplyAndFetch(): Promise<void>;

  /**
   * Fetches the state from the backend and synchronizes the local state.
   */
  fetch(): Promise<void>;
}
