import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { EntityObservableModelStore } from "./observable.ts";
import type { WritableModelStore } from "./writable.ts";

/**
 * The purpose of the remote model store is to provide a unified interface for
 * working with models for remote applications, such as frontend. Those
 * applications need transactions, change observation, undo/redo,
 * synchronization, etc.
 */
export interface RemoteModelStore extends WritableModelStore, EntityObservableModelStore, SimpleSyncRemoteModelStore {
  /**
   * Returns a materialized model for remote use.
   *
   * Since most models can be interpreted as entity models, this method is not
   * required for most cases. Use this method only if you need to work with the
   * model as a whole or with models that cannot be interpreted as entity
   * models.
   *
   * If model does not exist or if id is nullish, null is returned.
   *
   * If the model gets deleted, the instance becomes invalid. Any behavior of
   * such instance is undefined.
   *
   * Subsequent calls return the same model instance.
   */
  getModel(id: ModelIdentifier | null | undefined): Model | null;

  getConnectionStatus(): ConnectionStatus;
  subscribeToConnectionStatus(update: (status: ConnectionStatus) => void): () => void;
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
