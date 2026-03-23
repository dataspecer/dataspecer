import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { EntityChangeEvent, EntityObservableModelStore } from "../interfaces/entity.ts";
import type { UndoRedoChangeEvent, UndoRedoModelStore } from "../interfaces/undo-redo.ts";
import type { WritableModelStore } from "../interfaces/writable.ts";

// Due to TS limitations, we need to manually define the type of change event
type RemoteModelChangeEvent = EntityChangeEvent & UndoRedoChangeEvent;

/**
 * The purpose of the remote model store is to provide a unified interface for
 * working with models for remote applications, such as frontend. Those
 * applications need transactions, change observation, undo/redo,
 * synchronization, etc.
 */
export interface RemoteModelStore extends WritableModelStore, EntityObservableModelStore<RemoteModelChangeEvent>, UndoRedoModelStore<RemoteModelChangeEvent>, SimpleSyncRemoteModelStore {
  /**
   * Returns a materialized model for remote use.
   *
   * If model does not exist or if id is nullish, null is returned.
   *
   * If the model gets deleted, the instance becomes invalid. Any behavior of
   * such instance is undefined.
   *
   * Subsequent calls return the same model instance.
   */
  getModel(id: ModelIdentifier | null | undefined): Model | null;
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
