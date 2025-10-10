export enum ResourceChangeType {
  Removed,
  Created,
  Modified,
}

export interface ResourceChangeListener {
  /**
   * @param changedModel If null then the resource itself was changed
   */
  updateBasedOnResourceChange(resourceIri: string, changedModel: string | null, changeType: ResourceChangeType): Promise<void>;
}

export interface ResourceChangeObserver {
  addListener(listener: ResourceChangeListener): void;
  removeListener(listener: ResourceChangeListener): void;
  notifyListeners(resourceIri: string, changedModel: string, changeType: ResourceChangeType): Promise<void>;
}

export class ResourceChangeObserverBase implements ResourceChangeObserver {
  private listeners: ResourceChangeListener[] = [];

  addListener(listener: ResourceChangeListener): void {
    this.listeners.push(listener);
  }
  removeListener(listener: ResourceChangeListener): void {
    this.listeners = this.listeners
      .filter(existingListeners => existingListeners !== listener);
  }
  async notifyListeners(resourceIri: string, changedModel: string | null, changeType: ResourceChangeType): Promise<void> {
    for (const listener of this.listeners) {
      await listener.updateBasedOnResourceChange(resourceIri, changedModel, changeType);
    }
  }
}
