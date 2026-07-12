import type { PackageService } from "@dataspecer/core-v2/project";
import { createRdfsModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { PimStoreWrapper, serializationToPimModelEntities, buildPimResources } from "@dataspecer/core-v2/semantic-model/v1-adapters";
import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import { RDFS_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import { diffEntities } from "@dataspecer/core/entity-model";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import type { Model, ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import { createSetEntityOperation, type Operation } from "@dataspecer/core/operation";
import { BaseModelInModelStore, type ModelState } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";

export const ReloadModelOperationType = "http://dataspecer.com/core/operation/reload" as const;
/**
 * Operation that triggers refetch of the model data from the backend. After the
 * reload, the model should update itself with the new data.
 */
export interface ReloadModelOperation extends Operation {
  type: typeof ReloadModelOperationType;
}

export const SetModelUrlsOperationType = "http://dataspecer.com/core/operation/set-urls" as const;
export interface SetModelUrl extends Operation {
  type: typeof SetModelUrlsOperationType;

  urls: string[];
}

export interface MainEntity extends Entity {
  type: ["mainEntity"];
  alias?: string;
  urls?: string[];
}

export function getPimModelMetadata(entities: EntityRecord, modelId: ModelIdentifier): ModelMetadata | null {
  const mainEntity = entities[modelId] as MainEntity | undefined;
  if (!mainEntity) {
    return null;
  }
  return {
    label: mainEntity.alias ? { en: mainEntity.alias } : {},
    description: {},
  };
}

/**
 * Okay, so there will be two operations. Add/release query and then
 * self-operation for permanently updating the model.
 */
export class PimModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;
  protected httpFetch: HttpFetch;

  /**
   * Legacy model that holds the data and the state.
   */
  protected model: PimStoreWrapper | null = null;

  constructor(id: string, service: PackageService, httpFetch: HttpFetch) {
    super(id);
    this.service = service;
    this.httpFetch = httpFetch;
  }

  protected applyOperation(operation: Operation, mutableState: EntityRecord): void {
    if (operation.type === SetModelUrlsOperationType) {
      mutableState[this.id] = {
        ...mutableState[this.id],
        urls: (operation as SetModelUrl).urls,
      } as MainEntity;
      void this.freshLoad(mutableState[this.id] as MainEntity);
    } else if (operation.type === ReloadModelOperationType) {
      void this.freshLoad(mutableState[this.id] as MainEntity);
    } else {
      applyOperationsToSemanticModel(mutableState, [operation]);
    }
  }

  private async freshLoad(mainEntity: MainEntity): Promise<void> {
    // This loads the data again by using the old interface.

    const model = await createRdfsModel(mainEntity.urls ?? [], this.httpFetch);

    // Check if still relevant
    if (mainEntity !== this.getAllEntities()[this.id]) {
      return;
    }

    const oldModel = this.model!;
    this.model = model;

    const oldEntities = oldModel.getEntities();
    const newEntities = model.getEntities();

    const changes = diffEntities(oldEntities, newEntities);
    this.externalChange(changes);
  }

  protected async loadInternal(): Promise<ModelState> {
    const data = (await this.service.getResourceJsonData(this.id)) as any;
    const {adapter, entities} = serializationToPimModelEntities(data);
    this.model = adapter;
    return {
      entities,
      operations: [],
    };
  }

  /**
   * Sets up an empty legacy model synchronously, without fetching anything
   * from the backend. The model must always contain a {@link MainEntity}
   * representing itself, analogous to {@link loadInternal}.
   */
  protected override createNewInternal(): Operation[] {
    const adapter = new PimStoreWrapper({ resources: {} } as any, this.id, "model", []);
    adapter.fetchFromPimStore();
    this.model = adapter;

    const mainEntity: MainEntity = {
      id: this.id,
      type: ["mainEntity"],
      urls: [],
    };

    return [createSetEntityOperation(mainEntity)];
  }

  protected async saveInternal(state: ModelState): Promise<void> {
    const serialization = pimModelEntitiesToSerialization(this.id, state.entities);
    await this.service.setResourceJsonData(this.id, serialization);
  }
}

/**
 * Serializes the RDFS (PIM store wrapper) model. Inverse of
 * {@link serializationToPimModelEntities}.
 */
export function pimModelEntitiesToSerialization(modelId: ModelIdentifier, entities: EntityRecord): unknown {
  const mainEntity = entities[modelId];
  const mainEntityMetadata: Partial<typeof mainEntity> = {
    ...mainEntity,
  };
  delete mainEntityMetadata.id;
  delete mainEntityMetadata.type;

  return {
    ...mainEntityMetadata,
    type: RDFS_MODEL,
    id: modelId,
    pimStore: { resources: buildPimResources(entities, modelId) },
  };
}

export function createPimModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
    httpFetch: HttpFetch;
  },
): Model & ModelInDefaultFrontendModelStore {
  return new PimModelInModelStore(modelId, context.service, context.httpFetch);
}
