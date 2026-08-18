import { EntitiesChangeEvent } from "../../infrastructure/dataspecer";

/**
 * The provider should avoid consequent notifications with the same content.
 */
export interface CmeProvider {

  /**
   * Called on every change from the Dataspecer.
   * @param event
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
