import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import type { WritableModelStore } from "../interfaces/writable.ts";

export interface StateResult {
  /**
   * Current state that defines the model.
   * This should be stored on backend.
   */
  coreState: EntityRecord;

  /**
   * State including fake entities that are calculated from the coreState.
   * This should go to user.
   */
  outputState: EntityRecord;

  /**
   * Diff from the last outputState.
   */
  diff: EntityChange[];
}

/**
 * @internal Interface for management of individual models within the model
 * store. Model gets its state from the model store, so it is not managed by the
 * class implementing this interface. This interface then can react to changes
 * and add some "fake" entities to the state. This is the difference between the
 * coreState and the outputState. It also returns diff between old and new
 * outputState.
 *
 * For most models, there are no fake entities so the coreState and outputState
 * are the same.
 */
export interface ModelInModelStore {
  modelStore?: WritableModelStore;

  /**
   * Sets coreState as the new state of the model.
   */
  setState(coreState: EntityRecord): StateResult;

  /**
   * Applies operations and sets state (effectively calls setState).
   */
  applyOperationAndSetState(operations: Operation[]): StateResult;

  /**
   * If there are any other external changes (usually on fake entities in
   * outputState), this updates it.
   */
  subscribeForAsyncChanges(listener: (stateResult: StateResult) => void): () => void;

  /**
   * Call this method to obtain state from the backend. You need to call
   * setState by yourself to update the model.
   */
  getRemoteState(): Promise<EntityRecord>;
}