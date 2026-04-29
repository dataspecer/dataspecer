import type { PackageService } from "@dataspecer/core-v2/project";
import type { Entity, EntityIdentifier } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { BaseModelInModelStore } from "./base.ts";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";

/**
 * For given model returns everything as blob.
 */
export class BlobModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;

  protected history: Record<
    string,
    {
      previous: Record<string, Entity>;
      current: Record<string, Entity>;
    }
  > = {};

  protected entities: Record<EntityIdentifier, Entity> = {};

  getAllEntities() {
    return this.entities;
  }

  constructor(id: string, service: PackageService) {
    super(id);
    this.service = service;
  }

  applyOperations(operations: Operation[]): ApplyOperationResult {
    throw new Error("Applying operations to blob model is not yet supported!");
  }

  /**
   * Asynchronously loads the model state from the backend.
   */
  public async load(): Promise<void> {
    // Todo obtain all data, not just the main model.

    const data = await this.service.getResourceJsonData(this.id) as Entity;

    data.id = this.id;

    this.entities = {
      ...this.entities,
      [this.id]: data,
    }

    this.internalNotifyExternalChanges([{
      previous: null,
      next: data,
    }]);
  }

  public async save(): Promise<void> {
    throw new Error("Saving blob model is not yet supported!");
  }
}

export function createBlobModel(modelId: ModelIdentifier, context: {
  service: PackageService;
}): Model & ModelInDefaultFrontendModelStore {
  return new BlobModelInModelStore(modelId, context.service);
}
