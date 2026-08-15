import type { PackageService } from "@dataspecer/core-v2/project";
import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import type { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";
import { changesToSemanticModelOperations } from "@dataspecer/core-v2/semantic-model/operations";
import { createRdfsModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { serializationToPimModelEntities } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import { diffEntities, type Entity, type EntityRecord } from "@dataspecer/core/entity-model";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import type { ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import { type Operation } from "@dataspecer/core/operation";
import type { WritableModelStore } from "../interfaces/writable.ts";
import type { ModelInModelStore, StateResult } from "./interface.ts";
import { createStateResult } from "./state.ts";

export const ReloadModelOperationType = "https://schemas.dataspecer.com/rdfs-model/operations/reload" as const;
/**
 * Operation that triggers refetch of the model data from the backend. After the
 * reload, the model should update itself with the new data.
 */
export interface ReloadModelOperation extends Operation {
  type: typeof ReloadModelOperationType;
}

export const SetModelUrlsOperationType = "https://schemas.dataspecer.com/rdfs-model/operations/set-urls" as const;
export interface SetModelUrl extends Operation {
  type: typeof SetModelUrlsOperationType;

  urls: string[];
}

export interface MainEntity extends Entity {
  type: ["mainEntity"];
  urls?: string[];
  label?: LanguageString;
}

export function getPimModelMetadata(entities: EntityRecord, modelId: ModelIdentifier): ModelMetadata | null {
  const mainEntity = entities[modelId] as MainEntity | undefined;
  if (!mainEntity) {
    return null;
  }
  return {
    label: mainEntity.label ?? {},
    description: {},
  };
}

/**
 * Vocabulary imported by its URL. The entities are cached in the state and can
 * be refetched from the URLs by an operation, which happens asynchronously.
 */
export class PimModelInModelStore implements ModelInModelStore {
  private readonly id: ModelIdentifier;
  private readonly service: PackageService;
  private readonly httpFetch: HttpFetch;

  /** Needs to be injected */
  modelStore!: WritableModelStore;

  private state: EntityRecord = {};

  private asyncListeners: ((stateResult: StateResult) => void)[] = [];

  constructor(id: ModelIdentifier, service: PackageService, httpFetch: HttpFetch) {
    this.id = id;
    this.service = service;
    this.httpFetch = httpFetch;
  }

  setState(coreState: EntityRecord): StateResult {
    const result = createStateResult(this.state, coreState);
    this.state = coreState;
    return result;
  }

  applyOperationAndSetState(operations: Operation[]): StateResult {
    const coreState = { ...this.state };
    this.applyModelOperations(coreState, operations);
    return this.setState(coreState);
  }

  subscribeForAsyncChanges(listener: (stateResult: StateResult) => void): () => void {
    this.asyncListeners.push(listener);
    return () => {
      this.asyncListeners = this.asyncListeners.filter((asyncListener) => asyncListener !== listener);
    };
  }

  async getRemoteState(): Promise<EntityRecord> {
    const data = (await this.service.getResourceJsonData(this.id)) as object;
    // A model whose blob was never written starts as a fresh empty model.
    return serializationToPimModelEntities(data ?? { id: this.id, pimStore: { resources: {} } }).entities;
  }

  private applyModelOperations(entities: EntityRecord, operations: Operation[]): void {
    for (const operation of operations) {
      if (operation.type === SetModelUrlsOperationType) {
        entities[this.id] = {
          ...entities[this.id],
          urls: (operation as SetModelUrl).urls,
        } as MainEntity;
        this.reload(entities[this.id] as MainEntity);
      } else if (operation.type === ReloadModelOperationType) {
        this.reload(entities[this.id] as MainEntity);
      } else {
        applyOperationsToSemanticModel(entities, [operation]);
      }
    }
  }

  /**
   * Refetches the vocabulary from the urls of the main entity and reports the
   * new state once the data is available.
   */
  private async reload(mainEntity: MainEntity | undefined): Promise<void> {
    if (!mainEntity) {
      return;
    }

    let model;
    try {
      model = await createRdfsModel(mainEntity.urls ?? [], this.httpFetch);
    } catch (error) {
      console.error(`Failed to reload model "${this.id}".`, error);
      return;
    }

    if (this.state[this.id] !== mainEntity) {
      // The model was changed in the meantime, the result is not relevant.
      return;
    }

    const newState = serializationToPimModelEntities(model.serializeModel()).entities;
    const changes = diffEntities(this.state, newState);
    const { operations } = changesToSemanticModelOperations(changes);

    // Execute operation
    this.modelStore.transaction(
      operations.map((operation) => ({ operation, modelId: this.id })),
      {},
    );
  }
}

export function createPimModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
    httpFetch: HttpFetch;
  },
): PimModelInModelStore {
  return new PimModelInModelStore(modelId, context.service, context.httpFetch);
}
