export interface ChangeEvent {
  // empty, but can be extended
}

export interface ObservableModelStore<out ChangeEventType extends ChangeEvent = ChangeEvent> {
  /**
   * Subscribes to changes in all models in the store. This is useful for
   * gathering all changes at once to avoid multiple notifications from the same
   * transaction.
   *
   * To synchronize with the current state, you need to subscribe and fetch the
   * state from the models.
   * @returns Unsubscribe function.
   */
  subscribeToChanges(subscriber: (event: ChangeEventType) => void): () => void;
}
