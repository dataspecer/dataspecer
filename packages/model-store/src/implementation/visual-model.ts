import type { PackageService } from "@dataspecer/core-v2/project";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { serializationToVisualModelEntities, visualModelEntitiesToSerialization } from "@dataspecer/visual-model";
import { applyOperationsToVisualModel } from "@dataspecer/visual-model/executor";
import { BaseModelInModelStore, type ModelState } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";

/**
 * Since there is a mismatch between the old visual model entity interface (with
 * `identifier`) and the new core entity interface (with `id`), this class can
 * handle both interfaces during the transition period.
 */
export class VisualModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;

  constructor(id: string, service: PackageService) {
    super(id);
    this.service = service;
  }

  protected async loadInternal(): Promise<ModelState> {
    const data = await this.service.getResourceJsonData(this.id);
    return this.deserializeModel(data);
  }

  private async deserializeModel(data: unknown): Promise<ModelState> {
    return {
      entities: serializationToVisualModelEntities(data),
      operations: [], // todo still no operations
    };
  }

  protected async saveInternal(state: ModelState): Promise<void> {
    const data = this.serializeModel(state);
    await this.service.setResourceJsonData(this.id, data);
  }

  private serializeModel(state: ModelState): unknown {
    return visualModelEntitiesToSerialization(state.entities);
  }

  protected override applyOperation(operation: Operation, mutableState: EntityRecord): void {
    applyOperationsToVisualModel(mutableState, [operation]);
  }
}

export function createVisualModelInModelStore(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): Model & ModelInDefaultFrontendModelStore {
  return new VisualModelInModelStore(modelId, context.service);
}
