import { Entity, EntityModel, InMemoryEntityModel } from '@dataspecer/core-v2';
import { isSemanticModelClass, isSemanticModelRelationship } from '@dataspecer/core-v2/semantic-model/concepts';
import { Operation } from '@dataspecer/core-v2/semantic-model/operations';
import { CoreOperation, CoreOperationResult, CoreResource, CoreResourceReader, CoreResourceWriter } from "@dataspecer/core/core";
import * as DataPSM from "@dataspecer/core/data-psm/data-psm-vocabulary";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { PimResource } from "@dataspecer/core/pim/model";
import * as PIM from "@dataspecer/core/pim/pim-vocabulary";
import _ from "lodash";
import { ComplexOperation } from "./complex-operation.ts";
import { FederatedCoreResourceWriter } from "./federated-core-resource-writer.ts";
import type { ImmediateCoreResourceReader } from "@dataspecer/core/core/store"
import { Resource } from "./resource.ts";
import { InMemorySemanticModel } from '@dataspecer/core-v2/semantic-model/in-memory';

/**
 * Callback listening for resource changes.
 */
export type Subscriber = (iri: string, resource: Resource) => void;

interface Subscription {
    currentValue: Resource;
    subscribers: Subscriber[];
}

export function cloneResource<ResourceType extends CoreResource | Entity | null>(from: ResourceType, alreadyExists: ResourceType | null = null): ResourceType {
    return _.cloneDeep(from);
}

/**
 * Wraps store in case of additional metadata would be needed in the future.
 *
 * Currently, there are no metadata needed.
 */
type ModelWrapper = {
    store: CoreResourceReader,
    hasImmediateInterface: false,
} | {
    store: ImmediateCoreResourceReader & CoreResourceReader,
    hasImmediateInterface: true,
} | {
    store: EntityModel,
};

function isModelWrapperEntityModel(wrapper: ModelWrapper): wrapper is { store: EntityModel } {
    return wrapper.store["listResources"] === undefined;
}

function isModelWrapperCoreResourceReader(wrapper: ModelWrapper): wrapper is {
    store: CoreResourceReader,
    hasImmediateInterface: false,
} | {
    store: ImmediateCoreResourceReader & CoreResourceReader,
    hasImmediateInterface: true,
} {
    return wrapper.store["listResources"] !== undefined;
}

/**
 * Represents necessary information about a single schema that was obtained from
 * a store.
 *
 * @todo schema is a model
 */
interface CachedModel {
    // IRI of the schema's resource that is in the store
    iri: string;

    // Type of the schema's resource
    type: string;

    belongsToStore: ModelWrapper;

    isLoading: boolean;

    // List of resource IRIs that belongs to the schema and therefore are in the
    // same store as the schema's resource
    resources: string[];
}

function isPromise<T>(value: Promise<T>|T): value is Promise<T> {
    return value instanceof Promise;
}

/**
 * Federates multiple stores into one, allowing reading and modifying resources, observing changes and caching the results.
 *
 * @see {@link ../README.md README file}
 */
export class FederatedObservableStore implements FederatedCoreResourceWriter {
    /**
     * Models registered in this aggregator.
     */
    private models: ModelWrapper[] = [];

    // Schemas indexed by their IRI
    private modelSchemas: Map<string, CachedModel> = new Map();

    // List of current resource subscriptions
    private subscriptions: Map<string, Subscription> = new Map();


    // This store is passed to operations to read resources that are internally cached
    //private readonly storeForOperations: _CoreResourceReader_WithMissingMethods;
    // We will use lazy loading of resources during the operation execution. Only if needed the check method is called
    //private resourcesToCheckAfterOperation: Set<string> = new Set();
    private eventListeners: Map<string, Set<() => void>> = new Map();

    /**
     * Adds a store to the federated store and updates all resources that may
     * depend on it.
     * @param store
     * @param options
     * @returns Promise that completes when the store is added and all its
     * schemas are loaded. It is not required to wait for this promise to use
     * the store.
     */
    addStore<HasImmediateInterface extends boolean>(
        store: HasImmediateInterface extends true ? (ImmediateCoreResourceReader) : CoreResourceReader,
        options: { hasImmediateInterface?: HasImmediateInterface } = {}): Promise<void> {
        if (this.models.some(wrapper => wrapper.store === store)) {
            throw new Error("Store already presented in FederatedObservableStore.");
        }

        const wrappedStore = {
            store,
            hasImmediateInterface: options.hasImmediateInterface,
        } as ModelWrapper;
        this.models.push(wrappedStore);

        return this.getSchemas(wrappedStore);
    }

    /**
     * Removes a store from the federated store and updates all resources that
     * depend on it.
     * @param store
     */
    removeStore(store: CoreResourceReader) {
        const wrappedStore = this.models.find(wrapper => wrapper.store === store);
        if (wrappedStore === undefined) {
            throw new Error("Unable to remove store from FederatedObservableStore because it is not present.");
        }

        // Remove all schemas
        [...this.modelSchemas.values()].filter(s => s.belongsToStore === wrappedStore)
            .forEach(s => this.deleteSchema(s.iri));

        // Remove from stores
        this.models = this.models.filter(s => s !== wrappedStore);
    }

    /**
     * Adds subscriber to specific resource.
     *
     * The method is called immediately. todo is it ok?
     * @param iri IRI of the resource to subscribe to.
     * @param subscriber Method that will be called when the resource changes.
     */
    addSubscriber(iri: string, subscriber: Subscriber) {
        // Create if not yet exists
        if (!this.subscriptions.has(iri)) {
            this.createSubscriptionForNewResource(iri);
        }

        const subscription = this.subscriptions.get(iri) as Subscription;

        subscription.subscribers.push(subscriber);
        subscriber(iri, subscription.currentValue);
    }

    /**
     * Removes subscriber from specific resource.
     * @param iri IRI of the resource that was previously subscribed to.
     * @param subscriber Method that was previously subscribed to the resource.
     */
    removeSubscriber(iri: string, subscriber: Subscriber) {
        const entry = this.subscriptions.get(iri) as Subscription;
        entry.subscribers = entry.subscribers.filter(s => s !== subscriber);

        // Drop immediately if there are no more subscribers
        if (entry.subscribers.length === 0) {
            // todo: keep old cached resource
            //this.subscriptions.delete(iri);
        }
    }

    /**
     * Returns the {@link Resource} for given iri
     *
     * By calling this method the caller guarantees that eventually will
     * subscribe.
     * @param iri
     */
    getBeforeSubscription<ResourceType extends CoreResource | Entity>(iri: string): Resource<ResourceType> {
        if (!this.subscriptions.has(iri)) {
            this.createSubscriptionForNewResource(iri);
        }

        const subscription = this.subscriptions.get(iri) as Subscription;
        return subscription.currentValue as Resource<ResourceType>;
    }

    getStores(): (CoreResourceReader | EntityModel)[] {
        return this.models.map(s => s.store);
    }

    addEventListener(event: string, listener: () => void) {
        let entry = this.eventListeners.get(event);
        if (!entry) {
            entry = new Set();
            this.eventListeners.set(event, entry);
        }

        entry.add(listener);
    }

    removeEventListener(event: string, listener: () => void) {
        let entry = this.eventListeners.get(event) as Set<() => void>;
        entry.delete(listener);
        if (entry.size === 0) {
            this.eventListeners.delete(event);
        }
    }

    getSchemaForResource(iri: string): string | null {
        for (const schema of this.modelSchemas.values()) {
            if (schema.resources.includes(iri) || schema.iri === iri) {
                return schema.iri;
            }
        }
        return null;
    }

    /**
     * Returns PIM class IRI that has interpretation set to cimIri.
     * @param cimIri
     * @param pimSchemaIri
     */
    async getPimHavingInterpretation(cimIri: string, resourceType: string, pimSchemaIri: string): Promise<string|null> {
        const schema = this.modelSchemas.get(pimSchemaIri);
        if (!schema) {
            return null;
        }

        if (isModelWrapperEntityModel(schema.belongsToStore)) {
            const entities = Object.values(schema.belongsToStore.store.getEntities());
            for (const entity of entities) {
                if (isSemanticModelClass(entity) && entity.iri === cimIri) {
                    return entity.id;
                }
                if (isSemanticModelRelationship(entity) && (entity.ends[1].iri === cimIri || entity.ends[0].iri === cimIri)) {
                    return entity.id;
                }
            }
        }

        for (const resourceIri of schema.resources) {
            const resource = await this.readResource(resourceIri) as CoreResource;
            // Ducktyping for PimResource
            if ((resource as PimResource).pimInterpretation === cimIri && resource.types.includes(resourceType)) {
                return resourceIri;
            }
        }

        return null;
    }

    /**
     * @see https://github.com/dataspecer/dataspecer/issues/151
     * @param schemaIri Schema IRI under which the operation is applied
     * @param operation The operation to be applied
     */
    async applyOperation(schemaIri: string, operation: CoreOperation): Promise<CoreOperationResult> {
        const storeWrapper = this.modelSchemas.get(schemaIri)?.belongsToStore;
        // todo: this checks only the local schemas

        if (!storeWrapper) {
            throw new Error(`Internal error: No store found for schema ${schemaIri}.`);
        }

        let result;
        if (isModelWrapperEntityModel(storeWrapper)) {
            const op = operation as unknown as Operation;
            // @ts-ignore
            result = (storeWrapper.store).executeOperation(op);
            // @ts-ignore
            result.changed = op.type.startsWith("modify") ? [operation.id] : []; // todo: hotfix
            result.created = op.type.startsWith("create") ? [result.id] : []; // todo: hotfix
            result.deleted = op.type.startsWith("delete") ? [result.id] : []; // todo: hotfix
        } else {
            result = await (storeWrapper.store as unknown as CoreResourceWriter).applyOperation(operation);
        }


        for (const changedIri of result.changed) {
            this.loadResource(changedIri, schemaIri);
        }

        // This should not be necessary, because the schema updates as well
        // which causes the resources to be added and removed. Nevertheless,
        // it is crucial to create update as soon as possible.
        const schema = this.modelSchemas.get(schemaIri) as CachedModel;
        schema.resources = [
            ...schema.resources.filter(r => !result.deleted.includes(r)),
            ...result.created,
        ];
        this.updateResourcesBySchema(schema, result.created, result.deleted);

        return result;
    }


    /**
     * Executes complex operation on the store.
     * @param operation
     */
    async executeComplexOperation(operation: ComplexOperation) {
        try {
            operation.setStore(this);
            await operation.execute();
        } catch (e) {
            console.warn("Operation failed", e);
        }

        this.eventListeners.get("afterOperationExecuted")?.forEach(l => l());
    }

    async listResources(): Promise<string[]> {
        // todo: this method shall be optimized
        const resources = new Set<string>();
        for (const store of this.models) {
            if (isModelWrapperEntityModel(store)) {
                Object.values(store.store.getEntities()).forEach(entity => resources.add(entity.id));
                resources.add(store.store.getId());
            } else {
                (await store.store.listResources()).forEach(resource => resources.add(resource));
            }
        }
        return [...resources];
    }

    async listResourcesOfType(typeIri: string): Promise<string[]> {
        const resources = new Set<string>();
        for (const store of this.models) {
            if (isModelWrapperCoreResourceReader(store)) {
                (await store.store.listResourcesOfType(typeIri))
                    .forEach(resource => resources.add(resource));
            }
        }
        return [...resources];
    }

    readResource(iri: string): Promise<CoreResource|Entity|null> {
        return new Promise(resolve => {
            const subscriber: Subscriber = (_, resource) => {
                if (!resource.isLoading) {
                    this.removeSubscriber(iri, subscriber);
                    resolve(resource.resource);
                }
            }
            this.addSubscriber(iri, subscriber);
        });
    };

    async forceReload(iri: string) {
        const schemaIri = [...this.modelSchemas.values()].find(schema => schema.resources.includes(iri) || schema.iri === iri)?.iri;
        if (iri) {
            this.loadResource(iri, schemaIri);
        }
    }



    private createSubscriptionForNewResource(iri: string) {
        let schemaIri: string|null = null;
        for (const schema of this.modelSchemas.values()) {
            if (schema.resources.includes(iri)) {
                schemaIri = schema.iri;
                break;
            }
        }

        this.subscriptions.set(iri, {
            currentValue: {
                resource: null,
                isLoading: schemaIri !== null,
            },
            subscribers: [],
        });

        if (schemaIri !== null) {
            this.loadResource(iri, schemaIri);
        }
    }

    /**
     * Updates resource know value and triggers the subscribers.
     * Resource does not have to exist.
     * @param iri
     * @param update
     * @private
     */
    private updateSubscriptionTo(
        iri: string, update: Partial<Resource>) {
        const subscription = this.subscriptions.get(iri);
        if (!subscription) {
            return;
        }

        let doUpdate = false;
        for (const key of Object.keys(update)) {
            if (subscription.currentValue[key] !== update[key]) {
                doUpdate = true;
                break;
            }
        }

        if (doUpdate) {
            subscription.currentValue = {
                ...subscription.currentValue,
                ...update,
            };
            subscription.subscribers.forEach(s => s(iri, subscription.currentValue));
        }
    }

    doOptimisticUpdate(iri: string, resource: CoreResource | Entity | null) {
        this.updateSubscriptionTo(iri, {
            resource: cloneResource(resource),
        });
    }

    readSync(iri: string): CoreResource | Entity | null {
        const subscription = this.subscriptions.get(iri);
        if (!subscription) {
            return null;
        }

        return subscription.currentValue.resource;
    }

    /**
     * Loads the resource from the store regardless of the current value. The
     * store is identified by schema IRI which must be known.
     * @param resourceIri Resource to load and trigger its subscribers.
     * @param schemaIri Known schema IRI specifying concrete store.
     * @private
     */
    private loadResource(
        resourceIri: string, schemaIri: string,
    ) {
        const subscription = this.subscriptions.get(resourceIri);
        if (!subscription) {
            return;
        }

        const storeWrapper = this.modelSchemas.get(schemaIri).belongsToStore;

        // todo: If the resource is the model itself, it should not be cloned
        let doNotClone = false;

        let resource: Promise<CoreResource> | CoreResource | Entity | null;
        if (isModelWrapperEntityModel(storeWrapper)) {
            if (resourceIri === schemaIri) {
                doNotClone = resourceIri === schemaIri;
                // @ts-ignore
                resource = storeWrapper.store;
            } else {
                resource = storeWrapper.store.getEntities()[resourceIri];
            }
        } else {
            if (storeWrapper.hasImmediateInterface) {
                resource = storeWrapper.store.readResourceImmediate(resourceIri);
            } else {
                resource = storeWrapper.store.readResource(resourceIri);
            }
        }

        if (resource instanceof Promise) {
            this.updateSubscriptionTo(resourceIri, {
                isLoading: true,
            });

            resource.then(resource => {
                    // Following function checks the existence
                    this.updateSubscriptionTo(resourceIri, {
                        isLoading: false,
                        resource: cloneResource(resource),
                    });
                });
        } else {
            this.updateSubscriptionTo(resourceIri, {
                isLoading: false,
                resource: doNotClone ? resource : cloneResource(resource),
            });
        }
    }

    /**
     * If schema changes (loaded, updated, deleted) this functions updates the
     * subscriptions.
     * @private
     */
    private updateResourcesBySchema(
        schema: CachedModel, added: string[], removed: string[]) {
        for (const iri of added) {
            this.loadResource(iri, schema.iri);
        }

        for (const iri of removed) {
            this.updateSubscriptionTo(iri, {
                isLoading: false,
                resource: null,
            });
        }
    }

    /**
     * Fetches schemas for given store.
     * @param wrappedStore
     * @param updateAll Whether to update all the schemas or just the new ones.
     */
    private async getSchemas(wrappedStore: ModelWrapper, updateAll: boolean = false): Promise<void> {
        if (isModelWrapperCoreResourceReader(wrappedStore)) {
            const pimSchemas = await wrappedStore.store.listResourcesOfType(PIM.SCHEMA);
            const dataPsmSchemas = await wrappedStore.store.listResourcesOfType(DataPSM.SCHEMA);

            // Check if still relevant
            if (!this.models.includes(wrappedStore)) {
                return;
            }

            for (const schemaIri of pimSchemas) {
                let schema = this.modelSchemas.get(schemaIri);
                if (!schema) {
                    this.createSchema(schemaIri, wrappedStore, PIM.SCHEMA);
                }
            }

            for (const schemaIri of dataPsmSchemas) {
                let schema = this.modelSchemas.get(schemaIri);
                if (!schema) {
                    this.createSchema(schemaIri, wrappedStore, DataPSM.SCHEMA);
                }
            }

            // todo: remove schemas that are registered but not in the current list
        } else {
            const schema = this.createSchema(wrappedStore.store.getId(), wrappedStore, "EntityModel");
            const store = wrappedStore.store;
            store.subscribeToChanges((updated, removed) => {
                const updatedIds = Object.keys(updated);
                for (const updatedId of updatedIds) {
                    this.loadResource(updatedId, schema.iri);
                }
                schema.resources = Object.keys(store.getEntities());
                this.updateResourcesBySchema(schema, updatedIds, removed);
            });
        }
    }

    /**`
     * Registers new schema that does not exist yet.
     * @param schemaIri
     * @param store
     * @param type
     * @private
     */
    private createSchema(schemaIri: string, store: ModelWrapper, type: string) {
        const schema = {
            iri: schemaIri,
            type,
            belongsToStore: store,
            isLoading: true,
            resources: [],
        };
        this.modelSchemas.set(schemaIri, schema);
        // Because the schema does not exist yet, it is not possible that the
        // resource is cached
        this.addSubscriber(schemaIri, this.schemaUpdateListener);
        this.updateResourcesBySchema(schema, [schemaIri], []);
        return schema;
    }

    private deleteSchema(schemaIri: string) {
        this.removeSubscriber(schemaIri, this.schemaUpdateListener);
        const schema = this.modelSchemas.get(schemaIri);
        this.updateResourcesBySchema(schema, [], [...schema.resources, schemaIri]);
        this.modelSchemas.delete(schemaIri);
    }

    /**
     * Arrow function that listens for schema updates and accordingly updates
     * its resources and triggers the load of them if necessary.
     * @param iri
     * @param resource
     */
    private schemaUpdateListener: Subscriber = (iri, resource) => {
        const schema = this.modelSchemas.get(iri) as CachedModel; // Schema should be in the cache

        if (!resource.resource) {
            return;
        }

        if (resource.isLoading) {
            schema.isLoading = true;
            return;
        }
        schema.isLoading = false;

        let iris: string[] = [];

        if (DataPsmSchema.is(resource.resource)) {
            iris = resource.resource.dataPsmParts;
        // @ts-ignore
        } else if (resource.resource.getEntities) {
            // @ts-ignore
            iris = Object.keys(resource.resource.getEntities());
            // @ts-ignore
            iris.push(resource.resource.getId())
        } else {
            console.log(resource.resource);
            throw new Error(`Internal error: Unknown schema type.`);
        }

        // Update an existing list of resources
        const deleted = schema.resources.filter(iri => !iris.includes(iri));
        const added = iris.filter(iri => !schema.resources.includes(iri));
        schema.resources = iris;
        this.updateResourcesBySchema(schema, added, deleted);
    }
}
