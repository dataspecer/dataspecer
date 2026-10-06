import { EntitiesChangeEvent } from "../../infrastructure/dataspecer";

/**
 * The provider should avoid consequent notifications with the same content.
 */
export interface CmeProvider {

  /**
   * Called on every change from the Dataspecer.
   */
  onEntitiesDidChange(event: EntitiesChangeEvent): void;

  /**
   * Subscribe to a provider.
   */
  subscribe(subscriber: (value: CmeProviderEvent) => void): () => void;

}

export interface CmeProviderEvent {
  type: string
}

/**
 * Listener for {@link CmeProviderEvent}.
 */
export interface CmeListener {

  /**
   * Fired when any {@link CmeBridge} publish an event to its subscribers.
   */
  onProviderEvent(event: CmeProviderEvent): void;

}
