import type { PackageService } from "@dataspecer/core-v2/project";
import type { EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { v7 as uuidv7 } from "uuid";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";
import { PimStoreWrapper } from "@dataspecer/core-v2/semantic-model/v1-adapters";

/**
 * Old PIM model
 */
export class PimModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  id: string;
  protected service: PackageService;
  protected externalChangesSubscribers: ((changes: EntityChange[]) => void)[] = [];
  protected model!: PimStoreWrapper;

  constructor(id: string, service: PackageService) {
    this.id = id;
    this.service = service;
  }

  getAllEntities(): EntityRecord {
    return this.model.getEntities();
  }

  /**
   * This loads model data from the backend, this is not FETCH of remote model.
   */
  applyOperations(operations: Operation[]): ApplyOperationResult {
    console.warn("External semantic model operation application is not implemented yet.", operations);
    return {
      entityChanges: [],
      transactionId: uuidv7(),
    };
  }

  subscribeForAsyncChanges(_: (changeEvent: EntityChange[]) => void): () => void {
    // This model has no external changes
    return () => void 0;
  }

  async load(): Promise<void> {
    const modelData = await this.service.getResourceJsonData(this.id) as any;
    const model = new PimStoreWrapper(modelData.pimStore, this.id, "model", modelData.urls);
    model.fetchFromPimStore();
    this.model = model;

    // Todo add main entity
  }

  // todo add refetch?

  async save(): Promise<void> {

  }
}

export function createPimModel(modelId: ModelIdentifier, context: {
  service: PackageService;
}): Model & ModelInDefaultFrontendModelStore {
  return new PimModelInModelStore(modelId, context.service);
}
