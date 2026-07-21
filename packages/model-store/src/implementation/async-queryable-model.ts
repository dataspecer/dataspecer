import { QUERYABLE_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { PackageService } from "@dataspecer/core-v2/project";
import { type ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { CimAdapterWrapper } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import type { IriProvider } from "@dataspecer/core/cim/index";
import { diffEntities, type Entity, type EntityChange, type EntityChangeDeleted, type EntityIdentifier, type EntityRecord } from "@dataspecer/core/entity-model";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { SgovAdapter } from "@dataspecer/sgov-adapter";
import { BaseModelInModelStore, type ModelState } from "./base.ts";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";

class IdentityIriProvider implements IriProvider {
  cimToPim = (cimIri: string) => cimIri;
  pimToCim = (pimIri: string) => pimIri;
}

interface QueryEntity extends Entity {
  type: ["query"];
}

function isQueryEntity(entity: Entity): entity is QueryEntity {
  return entity.type.includes("query");
}

function queryStringToQueryEntity(query: string): QueryEntity {
  return {
    id: query,
    type: ["query"],
  };
}

function queryEntityToQueryString(entity: QueryEntity): string {
  return entity.id;
}

export const AddQueryOperationType = "http://dataspecer.com/core/operation/add-query" as const;
export interface AddQueryOperation extends Operation {
  type: typeof AddQueryOperationType;
  query: string;
}
export function isAddQueryOperation(operation: Operation): operation is AddQueryOperation {
  return operation.type === AddQueryOperationType;
}
export const RemoveQueryOperationType = "http://dataspecer.com/core/operation/remove-query" as const;
export interface RemoveQueryOperation extends Operation {
  type: typeof RemoveQueryOperationType;
  query: string;
}
export function isRemoveQueryOperation(operation: Operation): operation is RemoveQueryOperation {
  return operation.type === RemoveQueryOperationType;
}

/**
 * Models that can be queried asynchronously.
 * @todo this is only for SGOV model from CME
 */
export class AsyncQueryableModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;
  protected httpFetch: HttpFetch;

  /**
   * This is the adapter that allows us to query the model via individual
   * queries.
   */
  private queryAdapter!: CimAdapterWrapper;

  private currentQueries: Set<string> = new Set();
  private queryPromises: Record<string, Promise<void>> = {};

  /**
   * List of entities
   */
  protected semanticEntityMap: Record<
    string,
    {
      queryIds: Set<string>;
      entity: Entity;
    }
  > = {};

  /**
   * Underlying implementation of the model.
   * @todo this is just a temporary solution
   */
  protected model: ExternalSemanticModel | null = null;

  constructor(id: string, service: PackageService, httpFetch: HttpFetch) {
    super(id);
    this.service = service;
    this.httpFetch = httpFetch;

    super.subscribeForAsyncChanges((changes) => this.onUpdateQueryEntities(changes as EntityChange<QueryEntity>[]));
  }

  public override getAllEntities(): EntityRecord {
    const queryEntities = super.getAllEntities();
    const semanticEntities = Object.fromEntries(Object.values(this.semanticEntityMap).map((semanticEntity) => [semanticEntity.entity.id, semanticEntity.entity]));
    return {
      ...queryEntities,
      ...semanticEntities,
    };
  }

  public override getEntity(id: EntityIdentifier): Entity | null {
    return this.semanticEntityMap[id]?.entity ?? super.getEntity(id);
  }

  protected applyOperation(operation: Operation, mutableState: EntityRecord<QueryEntity>): void {
    applyOperationsToAsyncQueryableModel(mutableState, [operation]);
  }

  public override applyOperations(transactionId: string, operations: Operation[]): ApplyOperationResult {
    const result = super.applyOperations(transactionId, operations);
    const semanticChanges = this.onUpdateQueryEntities(result.entityChanges as EntityChange<QueryEntity>[]);
    return {
      entityChanges: [...result.entityChanges, ...semanticChanges],
      transactionId: result.transactionId,
    };
  }

  /**
   * Based on the changes in the query entities, it immediately removes the
   * entities that belonged to the deleted queries and starts loading the
   * entities for the new queries (that you will get notified about when the
   * loading is finished).
   */
  private onUpdateQueryEntities(changes: EntityChange<QueryEntity>[]): EntityChangeDeleted[] {
    const toRemoveQueries: Set<string> = new Set();
    for (const change of changes) {
      if (!change.next) {
        // Remove entities that belonged to the query
        const query = queryEntityToQueryString(change.previous);
        toRemoveQueries.add(query);
        this.currentQueries.delete(query);
        delete this.queryPromises[query]; // If not already deleted by resolution
      } else if (!change.previous) {
        // Add new query
        const query = queryEntityToQueryString(change.next);
        this.currentQueries.add(query);
        const promise = this.queryAdapter.query(query).then((result) => {
          delete this.queryPromises[query];
          if (!this.currentQueries.has(query)) {
            // Not relevant anymore
            return;
          }

          const newEntities: Entity[] = [];

          for (const entity of Object.values(result)) {
            if (!this.semanticEntityMap[entity.id]) {
              this.semanticEntityMap[entity.id] = {
                queryIds: new Set(),
                entity,
              };
              newEntities.push(entity); // only for new entities, otherwise we would trigger unnecessary updates
            }

            this.semanticEntityMap[entity.id].queryIds.add(query);

            // todo we should check if entities match
          }

          this.notifySubscribers(
            newEntities.map(
              (entity) =>
                ({
                  previous: null,
                  next: entity,
                }) satisfies EntityChange,
            ),
          );
        }).catch((error) => {
          delete this.queryPromises[query];
          console.error(`Failed to execute query "${query}" on model "${this.id}".`, error);
        });
        this.queryPromises[query] = promise;
      } else {
        console.error(change, changes);
        throw new Error("Change in query entities is not supported as it makes no sense.");
      }
    }

    const deletedEntities: Entity[] = [];
    for (const semanticEntity of Object.values(this.semanticEntityMap)) {
      semanticEntity.queryIds = semanticEntity.queryIds.difference(toRemoveQueries);
      if (semanticEntity.queryIds.size === 0) {
        delete this.semanticEntityMap[semanticEntity.entity.id];
        deletedEntities.push(semanticEntity.entity);
      }
    }

    return deletedEntities.map(
      (entity) =>
        ({
          previous: entity,
          next: null,
        }) satisfies EntityChangeDeleted,
    );
  }

  private fullChangesSubscribers: ((changes: EntityChange[]) => void)[] = [];
  protected notifySubscribers(changes: EntityChange[]): void {
    for (const listener of this.fullChangesSubscribers) {
      listener(changes);
    }
  }
  public override subscribeForAsyncChanges(listener: (changes: EntityChange[]) => void): () => void {
    this.fullChangesSubscribers.push(listener);
    return () => {
      this.fullChangesSubscribers = this.fullChangesSubscribers.filter((l) => l !== listener);
    };
  }

  protected async loadInternal(): Promise<ModelState> {
    this.queryAdapter = this.createQueryAdapter();

    // Load data
    const modelData = (await this.service.getResourceJsonData(this.id)) as any;
    return this.deserializeModel(modelData);
  }

  private createQueryAdapter(): CimAdapterWrapper {
    const adapter = new SgovAdapter("https://slovník.gov.cz/sparql", httpFetch);
    adapter.setIriProvider(new IdentityIriProvider());
    return new CimAdapterWrapper(adapter);
  }

  /**
   * An empty model (no queries) is a valid state and needs no main entity,
   * but the query adapter must still be set up before any query operations
   * can be applied.
   */
  protected override createNewInternal(): Operation[] {
    this.queryAdapter = this.createQueryAdapter();
    return [];
  }

  /**
   * Deserializes the part of the model that is actually stored on the backend.
   */
  private deserializeModel(data: unknown): ModelState {
    return {
      entities: serializationToAsyncQueryableModelEntities(data),
      operations: [],
    };
  }
}

/**
 * Applies async queryable model operations (add/remove query) to the given
 * entities and returns the net changes. The entities are modified in place.
 * Note that this only manipulates the query entities; fetching the semantic
 * entities the queries resolve to is up to the caller, see
 * {@link resolveAsyncQueryableModelEntities}.
 *
 * @todo Move to a separate `apply-operations.ts` file outside of the model
 *  store package.
 */
export function applyOperationsToAsyncQueryableModel(entities: EntityRecord, operations: Operation[]): EntityChange[] {
  const previous = { ...entities };

  for (const operation of operations) {
    if (isAddQueryOperation(operation)) {
      if (!entities[operation.query]) {
        entities[operation.query] = queryStringToQueryEntity(operation.query);
      }
    } else if (isRemoveQueryOperation(operation)) {
      delete entities[operation.query];
    } else {
      // Per the Operation contract, operations that cannot be executed are
      // ignored.
      console.warn(`Unsupported operation "${operation.type}" for the async queryable model. The operation is ignored.`);
    }
  }

  return diffEntities(previous, entities);
}

/**
 * Serializes the async queryable (SGOV) model, i.e. only its queries. Inverse
 * of {@link serializationToAsyncQueryableModelEntities}.
 */
export function asyncQueryableModelEntitiesToSerialization(modelId: ModelIdentifier, entities: EntityRecord): unknown {
  return {
    type: QUERYABLE_MODEL,
    id: modelId,
    queries: Object.values(entities).filter(isQueryEntity).map(queryEntityToQueryString),
  };
}

/**
 * Deserializes the async queryable (SGOV) model but does not fetch entities.
 * This is synchronous function that returns only the queries.
 *
 * Use {@link resolveAsyncQueryableModelEntities} to fetch the semantic entities
 * the queries resolve to.
 */
export function serializationToAsyncQueryableModelEntities(data: unknown): EntityRecord {
  // Missing data (a blob that was never written) yields an empty model.
  const modelDescriptor = (data ?? {}) as { queries?: string[] };
  const queries = modelDescriptor.queries ?? [];
  return Object.fromEntries(queries.map(queryStringToQueryEntity).map((entity) => [entity.id, entity]));
}

/**
 * Takes entity model containing queries and fetches the semantic entities the
 * queries resolve to.
 *
 * @see {@link serializationToAsyncQueryableModelEntities} for deserialization of the model.
 */
export async function resolveAsyncQueryableModelEntities(entities: EntityRecord, httpFetch: HttpFetch): Promise<EntityRecord> {
  const adapter = new SgovAdapter("https://slovník.gov.cz/sparql", httpFetch);
  adapter.setIriProvider(new IdentityIriProvider());
  const queryAdapter = new CimAdapterWrapper(adapter);

  const queries = Object.values(entities).filter(isQueryEntity).map(queryEntityToQueryString);

  const queryResults = await Promise.all(queries.map((query) => queryAdapter.query(query)));
  const semanticEntities: EntityRecord = Object.assign({}, ...queryResults);

  return {
    ...entities,
    ...semanticEntities,
  };
}

export function createAsyncQueryableModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
    httpFetch: HttpFetch;
  },
): Model & ModelInDefaultFrontendModelStore {
  return new AsyncQueryableModelInModelStore(modelId, context.service, context.httpFetch);
}
