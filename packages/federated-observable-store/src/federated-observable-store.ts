import { Entity } from "@dataspecer/core-v2";
import { CoreOperation, CoreResource, CoreResourceReader } from "@dataspecer/core/core";
import type { EntityChange, EntityChangeCreated, EntityIdentifier, EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { Operation, OperationInModel } from "@dataspecer/core/operation";
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
  protected addOperationForTransaction?: (operations: OperationInModel[]) => void;
  protected commitTransaction?: (metadata: object) => void;

  constructor(
    addOperationForTransaction?: (operations: OperationInModel[]) => void,
    commitTransaction?: (metadata: object) => void,
  ) {
    this.addOperationForTransaction = addOperationForTransaction;
    this.commitTransaction = commitTransaction;
  }

  listResources(): string[] {
    return Array.from(this.entities.keys());
  }

  getSchemaForResource(iri: string): string | null {
    return this.entities.get(iri).modelId ?? null;
  }

  listResourcesOfType(typeIri: string): string[] {
    return (
      this.entities
        .values()
        .map((entityMetadata) => entityMetadata.resource)
        // @ts-expect-error we are checking type and types
        .filter((e) => e.type?.includes(typeIri) || e.types?.includes(typeIri))
        .map((e) => e.id)
        .toArray()
    );
  }

  /**
   * @todo There is a problem that currently we are using two different interfaces for resource.
   */
  readResource(iri: string): any | null {
    return (this.entities.get(iri)?.resource as unknown as CoreResource & Entity) ?? null;
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
        if (!changeItem.next.id) {
          throw new Error("Entity must have an id");
        }

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
    if (!this.addOperationForTransaction) {
      throw new Error("The model is read only.");
    };
    return this.addOperationForTransaction([{
      modelId,
      operation: operation as Operation,
    }]);
  }

  /**
   * All the user operations in DSE are executed via this method. Since all
   * opearations are synchronous, we should start and commit transaction here in
   * order to properly handle undo/redo functionality.
   */
  executeComplexOperation(operation: ComplexOperation) {
    if (!this.commitTransaction || !this.addOperationForTransaction) {
      throw new Error("The model is read only.");
    }
    try {
      operation.setStore(this);
      operation.execute();
    } catch (e) {
      console.warn("Operation failed", e);
    } finally {
      this.commitTransaction({});
    }
  }
}
