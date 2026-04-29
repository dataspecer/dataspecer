import { Entity } from "@dataspecer/core-v2";
import { Operation } from "@dataspecer/core-v2/semantic-model/operations";
import { CoreOperation, CoreResource, CoreResourceReader } from "@dataspecer/core/core";
import type { EntityChange, EntityChangeCreated, EntityIdentifier, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { ComplexOperation } from "./complex-operation.ts";
import { FederatedCoreResourceWriter } from "./federated-core-resource-writer.ts";
import { Resource } from "./resource.ts";

/**
 * Callback listening for resource changes.
 */
export type Subscriber = (iri: string, resource: Resource) => void;

/**
 * This is new implementation for model store
 */
export class FederatedObservableStore implements FederatedCoreResourceWriter, CoreResourceReader {
  protected entities: Map<
    EntityIdentifier,
    {
      modelId: ModelIdentifier;
      resource: Entity;
      isLoading: boolean;
    }
  > = new Map();
  protected toNotifyUpdate: Set<EntityIdentifier> = new Set();
  protected entitySubscriptions: Map<string, Set<Subscriber>> = new Map();
  protected allChangesSubscribers: Set<() => void> = new Set();
  protected operationExecutor: (modelId: ModelIdentifier, operation: CoreOperation | Operation) => any;

  constructor(operationExecutor: (modelId: ModelIdentifier, operation: CoreOperation | Operation) => any) {
    this.operationExecutor = operationExecutor;
  }

  listResources(): string[] {
    return Array.from(this.entities.keys());
  }

  getSchemaForResource(iri: string): string | null {
    return this.entities.get(iri).modelId ?? null;
  }

  listResourcesOfType(typeIri: string): string[] {
    return this.entities
      .values()
      .map((entityMetadata) => entityMetadata.resource)
      .filter((e) => e.type.includes(typeIri))
      .map((e) => e.id)
      .toArray();
  }

  readResource(iri: string): CoreResource | null {
    return (this.entities.get(iri)?.resource as unknown as CoreResource) ?? null;
  }

  addModel(modelId: string, entities: EntityRecord): void {
    this.updateModel(
      modelId,
      Object.values(entities).map(
        (e) =>
          ({
            previous: null,
            next: e,
          }) satisfies EntityChangeCreated,
      ),
    );
  }

  updateModel(modelId: string, change: EntityChange[]): void {
    for (const changeItem of change) {
      if (changeItem.next) {
        // Update or create
        // todo check previous state
        this.entities.set(changeItem.next.id, {
          modelId,
          resource: changeItem.next,
          isLoading: false,
        });
        this.toNotifyUpdate.add(changeItem.next.id);
      } else {
        // Delete
        this.entities.delete(changeItem.previous.id);
        this.toNotifyUpdate.add(changeItem.previous.id);
      }
    }

    this.flushNotifications();
  }

  removeModel(modelId: string): void {
    this.entities.forEach((metadata, iri) => {
      if (metadata.modelId === modelId) {
        this.entities.delete(iri);
        this.toNotifyUpdate.add(iri);
      }
    });
  }

  protected flushNotifications() {
    if (this.toNotifyUpdate.size > 0) {
      for (const iri of this.toNotifyUpdate) {
        const entity = this.entities.get(iri);
        this.entitySubscriptions.get(iri)?.forEach((subscriber) => subscriber(iri, entity));
      }
    }
    this.toNotifyUpdate.clear();
    this.allChangesSubscribers.forEach((callback) => callback());
  }

  addSubscriber(iri: string, subscriber: Subscriber): void {
    if (!this.entitySubscriptions.has(iri)) {
      this.entitySubscriptions.set(iri, new Set());
    }
    this.entitySubscriptions.get(iri).add(subscriber);
  }

  removeSubscriber(iri: string, subscriber: Subscriber): void {
    this.entitySubscriptions.get(iri)?.delete(subscriber);
    if (this.entitySubscriptions.get(iri)?.size === 0) {
      this.entitySubscriptions.delete(iri);
    }
  }

  subscribeToChanges(listener: () => void): () => void {
    this.allChangesSubscribers.add(listener);
    return () => this.allChangesSubscribers.delete(listener);
  }

  applyOperation(modelId: ModelIdentifier, operation: CoreOperation | Operation): any {
    return this.operationExecutor(modelId, operation);
  }

  /**
   * This should guard the transaction.
   */
  executeComplexOperation(operation: ComplexOperation) {
    // todo start transaction
    try {
      operation.setStore(this);
      operation.execute();
    } catch (e) {
      console.warn("Operation failed", e);
    }
    // todo commit transaction
  }
}
