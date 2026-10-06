import { QUERYABLE_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { PackageService } from "@dataspecer/core-v2/project";
import { CimAdapterWrapper } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import type { IriProvider } from "@dataspecer/core/cim";
import { diffEntities, type Entity, type EntityChange, type EntityIdentifier, type EntityRecord } from "@dataspecer/core/entity-model";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import type { ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { SgovAdapter } from "@dataspecer/sgov-adapter";
import type { ModelInModelStore, StateResult } from "./interface.ts";

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

function createQueryAdapter(httpFetch: HttpFetch): CimAdapterWrapper {
  const adapter = new SgovAdapter("https://slovník.gov.cz/sparql", httpFetch);
  adapter.setIriProvider(new IdentityIriProvider());
  return new CimAdapterWrapper(adapter);
}

export const AddQueryOperationType = "https://schemas.dataspecer.com/queryable-model/operations/create-query" as const;
export interface AddQueryOperation extends Operation {
  type: typeof AddQueryOperationType;
  query: string;
}
export function isAddQueryOperation(operation: Operation): operation is AddQueryOperation {
  return operation.type === AddQueryOperationType;
}
export const RemoveQueryOperationType = "https://schemas.dataspecer.com/queryable-model/operations/delete-query" as const;
export interface RemoveQueryOperation extends Operation {
  type: typeof RemoveQueryOperationType;
  query: string;
}
export function isRemoveQueryOperation(operation: Operation): operation is RemoveQueryOperation {
  return operation.type === RemoveQueryOperationType;
}

/**
 * Models that can be queried asynchronously. The core state contains only the
 * queries, the entities they resolve to are fetched asynchronously and are part
 * of the output state.
 *
 * @todo this is only for SGOV model from CME
 */
export class AsyncQueryableModelInModelStore implements ModelInModelStore {
  private readonly id: ModelIdentifier;
  private readonly service: PackageService;

  /**
   * This is the adapter that allows us to query the model via individual
   * queries.
   */
  private readonly queryAdapter: CimAdapterWrapper;

  private coreState: EntityRecord = {};
  private outputState: EntityRecord = {};

  /**
   * Entities the current queries resolved to, each with the queries it came
   * from. An entity is dropped when the last of its queries is removed.
   */
  private resolvedEntities: Record<EntityIdentifier, { queries: Set<string>; entity: Entity }> = {};

  private currentQueries: Set<string> = new Set();

  private asyncListeners: ((stateResult: StateResult) => void)[] = [];

  constructor(id: ModelIdentifier, service: PackageService, httpFetch: HttpFetch) {
    this.id = id;
    this.service = service;
    this.queryAdapter = createQueryAdapter(httpFetch);
  }

  setState(coreState: EntityRecord): StateResult {
    this.setQueries(new Set(Object.values(coreState).filter(isQueryEntity).map(queryEntityToQueryString)));
    return this.getStateResult(coreState);
  }

  applyOperationAndSetState(operations: Operation[]): StateResult {
    const coreState = { ...this.coreState };
    applyOperationsToAsyncQueryableModel(coreState, operations);
    return this.setState(coreState);
  }

  subscribeForAsyncChanges(listener: (stateResult: StateResult) => void): () => void {
    this.asyncListeners.push(listener);
    return () => {
      this.asyncListeners = this.asyncListeners.filter((asyncListener) => asyncListener !== listener);
    };
  }

  async getRemoteState(): Promise<EntityRecord> {
    return serializationToAsyncQueryableModelEntities(await this.service.getResourceJsonData(this.id));
  }

  /**
   * Updates queries - starts loading new and removes entities of old queries.
   */
  private setQueries(queries: Set<string>): void {
    for (const query of queries.difference(this.currentQueries)) {
      this.startQuery(query);
    }

    const removedQueries = this.currentQueries.difference(queries);
    if (removedQueries.size > 0) {
      for (const id in this.resolvedEntities) {
        const resolved = this.resolvedEntities[id];
        resolved.queries = resolved.queries.difference(removedQueries);
        if (resolved.queries.size === 0) {
          delete this.resolvedEntities[id];
        }
      }
    }

    this.currentQueries = queries;
  }

  private async startQuery(query: string): Promise<void> {
    try {
      const result = await this.queryAdapter.query(query);

      if (!this.currentQueries.has(query)) {
        // The query was removed in the meantime, the result is not relevant.
        return;
      }

      let hasNewEntities = false;
      for (const entity of Object.values(result)) {
        const resolved = this.resolvedEntities[entity.id];
        if (resolved === undefined) {
          this.resolvedEntities[entity.id] = { queries: new Set([query]), entity };
          hasNewEntities = true;
        } else {
          resolved.queries.add(query);
        }
      }

      if (!hasNewEntities) {
        return;
      }

      const stateResult = this.getStateResult(this.coreState);
      for (const listener of this.asyncListeners) {
        listener(stateResult);
      }
    } catch (error) {
      console.error(`Failed to execute query "${query}" on model "${this.id}".`, error);
    }
  }

  private getStateResult(coreState: EntityRecord): StateResult {
    const outputState: EntityRecord = { ...coreState };
    for (const id in this.resolvedEntities) {
      outputState[id] = this.resolvedEntities[id].entity;
    }

    const diff = diffEntities(this.outputState, outputState);
    this.coreState = coreState;
    this.outputState = outputState;
    return { coreState, outputState, diff };
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
  const queryAdapter = createQueryAdapter(httpFetch);

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
): AsyncQueryableModelInModelStore {
  return new AsyncQueryableModelInModelStore(modelId, context.service, context.httpFetch);
}
