import type { PackageService } from "@dataspecer/core-v2/project";
import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { BaseModelInModelStore, type ModelState } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";

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
    throw new Error("Applying operations to blob model is not yet supported!");
  }

  protected async loadInternal(): Promise<ModelState> {
    // Todo obtain all data, not just the main model.

    const data = ((await this.service.getResourceJsonData(this.id)) as Entity) ?? {};

    data.id = this.id;

    const entities = {
      [this.id]: data,
    }

    return {
      entities,
      operations: [],
    };
  }

  protected async saveInternal(state: ModelState): Promise<void> {
    throw new Error("Saving blob model is not yet supported!");
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
