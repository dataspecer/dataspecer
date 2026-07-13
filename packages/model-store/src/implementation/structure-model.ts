import type { PackageService } from "@dataspecer/core-v2/project";
import { type CoreOperationAndOperation, type CoreResourceAndEntity } from "@dataspecer/core/core";
import { applyOperationsToStructureModel, initializeStructureModel, serializationToStructureModelEntities } from "@dataspecer/core/data-psm";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import { type Operation } from "@dataspecer/core/operation";
import { BaseModelInModelStore } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";

/**
 * Currently, the structure model is PSM. This will be changed in the future,
 * but we will already call it properly to avoid refactoring in the future.
 */
export class StructureModelInModelStore extends BaseModelInModelStore<CoreResourceAndEntity> implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;

  constructor(id: string, service: PackageService) {
    super(id);
    this.service = service;
  }

  /**
   * Loads structure model state from the backend.
   * When resolves, everything is loaded and ready to be used.
   */
  protected async loadInternal() {
    const data = await this.service.getResourceJsonData(this.id);
    return serializationToStructureModelEntities(data);
  }

  /**
   * Executes given operation and changes the state of the model.
   */
  protected override applyOperation(operation: CoreOperationAndOperation, mutableState: EntityRecord<CoreResourceAndEntity>): void {
    applyOperationsToStructureModel(mutableState, [operation]);
  }

  protected override createNewInternal(): Operation[] {
    return initializeStructureModel(this.id);
  }
}


export function createStructureModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): Model & ModelInDefaultFrontendModelStore {
  return new StructureModelInModelStore(modelId, context.service);
}
