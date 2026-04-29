import type { EntityChange } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";

export interface ObservableEntityModelStoreChangeEvent {
  /**
   * Entities cannot transfer between models, so the changes are grouped by model.
   */
  entityChanges: Record<ModelIdentifier, EntityChange[]>;
}

/**
 * Model Store that is mutable, meaning individual models are mutable, can have
 * this interface to observe changes across all models. Immutable models can be
 * used for example for specification generation, where we want an immutable
 * snapshot of the project. This interface is thus useful for frontend
 * applications.
 *
 * Most of the models are simple entity models containing concepts like classes,
 * properties, objects, etc. This provides a unified interface to observe all of
 * them at once which eases some of the processes in the frontend.
 *
 * However, you can still read individual models and observe them directly. This
 * is useful for non-entity models for which you must use their own API.
 *
 * For most models, if you dispatch an operations, the change will be applied
 * synchronously including the notification of all observers. However, some
 * models may apply changes asynchronously and thus notify asynchronously. This
 * is something to keep in mind when working with the model store.
 *
 * If the model is in loading state, you should be careful when applying
 * operations that depend on the model as you work with inconsistent state.
 *
 * Specifically, this interface targets only entity models due to optimization
 * reasons. When change occurs in multiple models, we want to gather all changes
 * at once to avoid multiple notifications from the same transaction.
 */
export interface EntityObservableModelStore {
  /**
   * Subscribes to changes in all entity models. The purpose of this method is to
   * gather all changes at once to avoid multiple notifications from the same
   * transaction.
   *
   * The event fires synchronously upon transaction submission, provided that
   * changes have occurred.
   *
   * This method subscribes only to entity models. If there are other models you
   * want to subscribe to, use the model's own methods.
   *
   * For most operations, you will be notified synchronously. Some models may
   * notify asynchronously.
   *
   * @todo should fire with everything for new listeners?
   * @todo should fire with entities when model is added? Probably yes.
   *
   * @returns Unsubscribe function.
   */
  subscribeToEntityChanges(listener: (entityChaneEvent: ObservableEntityModelStoreChangeEvent) => void): () => void
}


// todo

// There is this question of how to subscribe to only some models. Currently we can fix that that you always subscribe to everything.
