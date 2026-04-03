
/**
 * Reprensents the possible changes made to resource and to watch for with relation to the observer pattern.
 */
export enum ResourceChangeType {
  Removed,
  Created,
  Modified,
}

/**
 * Interface which should be implemented by the listener to the resource model in the observer pattern.
 */
export interface ResourceChangeListener {
  /**
   * @param changedModel If null then the resource itself was changed
   */
  updateBasedOnResourceChange(
    resourceIri: string,
    changedModel: string | null,
    changeType: ResourceChangeType,
    mergeStateUUIDsToIgnoreInUpdating: string[],
  ): Promise<void>;

  updateBasedOnGitLinkRemovalFromModel(gitLink: string): Promise<void>;
}

/**
 * Interface which should be implemented by the "subject" of the observer pattern.
 * It's purpose is to notify the listeners ({@link ResourceChangeListener}).
 */
export interface ResourceChangePublisher {
  /**
   * Adds new {@link listener}, which will be notified in future when change on some of the resource happens.
   */
  addListener(listener: ResourceChangeListener): void;

  /**
   * Removes existing {@link listener} from the list of listeners, which should be notified in the future.
   */
  removeListener(listener: ResourceChangeListener): void;

  /**
   * The notify method of the observer pattern.
   */
  notifyListenersAboutResourceChange(
    resourceIri: string,
    changedModel: string,
    changeType: ResourceChangeType,
    mergeStateUUIDsToIgnoreInUpdating: string[],
  ): Promise<void>;

  /**
   * Another notify method of the observer pattern. This one handles the case when a gitUrl is removed from Dataspecer because the remote repository was removed
   */
  notifyListenersAboutGitLinkRemovalFromModel(gitLink: string): Promise<void>;
}

export class ResourceChangeObserverBase implements ResourceChangePublisher {
  private listeners: ResourceChangeListener[] = [];

  addListener(listener: ResourceChangeListener): void {
    this.listeners.push(listener);
  }
  removeListener(listener: ResourceChangeListener): void {
    this.listeners = this.listeners
      .filter(existingListeners => existingListeners !== listener);
  }
  async notifyListenersAboutResourceChange(
    resourceIri: string,
    changedModel: string | null,
    changeType: ResourceChangeType,
    mergeStateUUIDsToIgnoreInUpdating: string[],
  ): Promise<void> {
    for (const listener of this.listeners) {
      await listener.updateBasedOnResourceChange(resourceIri, changedModel, changeType, mergeStateUUIDsToIgnoreInUpdating);
    }
  }
  async notifyListenersAboutGitLinkRemovalFromModel(gitLink: string): Promise<void> {
    for (const listener of this.listeners) {
      await listener.updateBasedOnGitLinkRemovalFromModel(gitLink);
    }
  }
}
