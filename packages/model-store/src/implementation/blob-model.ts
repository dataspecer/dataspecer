import type { PackageService } from "@dataspecer/core-v2/project";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { UpdateEntityOperationType, type UpdateEntityOperation } from "@dataspecer/core/operation";
import { BaseModelInModelStore, type ModelState } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";
import { serializationToBlobModelEntities } from "@dataspecer/core/entity-model/utils";

/**
 * For given model returns everything as blob.
 */
export class BlobModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;

  constructor(id: string, service: PackageService) {
    super(id);
    this.service = service;
  }

  protected applyOperation(operation: Operation, mutableState: EntityRecord): void {
    if (operation.type !== UpdateEntityOperationType) {
      throw new Error("Applying operations to blob model is not yet supported!");
    }

    const updateOperation = operation as UpdateEntityOperation;
    const currentEntity = mutableState[this.id];

    if (updateOperation.update.id !== this.id) {
      throw new Error(`Blob model can only update entity with id \"${this.id}\".`);
    }

    mutableState[this.id] = {
      ...currentEntity,
      ...updateOperation.update,
    };
  }

  protected async loadInternal(): Promise<ModelState> {
    const data = await this.service.getResourceJsonData(this.id) as object;
    const entities = serializationToBlobModelEntities(this.id, data);

    return {
      entities,
      operations: [],
    };
  }

  protected async saveInternal(state: ModelState): Promise<void> {
    const data = state.entities[this.id];
    await this.service.setResourceJsonData(this.id, data);
  }
}

export function createBlobModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): Model & ModelInDefaultFrontendModelStore {
  return new BlobModelInModelStore(modelId, context.service);
}
