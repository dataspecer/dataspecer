import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { Model } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";

export abstract class BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  protected externalChangesSubscribers: ((changes: EntityChange[]) => void)[] = [];

  /**
   * Subscribes to entity changes that are not caused by applying operations in this model.
   */
  subscribeForAsyncChanges(listener: (changes: EntityChange[]) => void): () => void {
    this.externalChangesSubscribers.push(listener);
    return () => {
      this.externalChangesSubscribers = this.externalChangesSubscribers.filter((l) => l !== listener);
    };
  }

  /**
   * Triggers subscribed listeners for external changes.
   */
  protected internalNotifyExternalChanges(changes: EntityChange[]): void {
    for (const listener of this.externalChangesSubscribers) {
      listener(changes);
    }
  }

  abstract getAllEntities(): EntityRecord;
  abstract applyOperations(operations: Operation[]): ApplyOperationResult;
  abstract load(): Promise<void>;
  abstract save(): Promise<void>;
}
