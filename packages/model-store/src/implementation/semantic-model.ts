import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { PackageService } from "@dataspecer/core-v2/project";
import { applyOperationsToSemanticModel, semanticModelEntitiesToSerialization, serializationToSemanticModelEntities } from "@dataspecer/core-v2/semantic-model";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import { createSetEntityOperation, type Operation } from "@dataspecer/core/operation";
import { BaseModelInModelStore, type ModelState } from "./base.ts";
import type { ModelInDefaultFrontendModelStore } from "./implementation.ts";

/**
 * This class implements support for semantic model for DefaultFrontendModelStore.
 */
export class SemanticModelInModelStore extends BaseModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  protected service: PackageService;

  constructor(id: string, service: PackageService) {
    super(id);
    this.service = service;
  }

  protected async loadInternal(): Promise<ModelState> {
    const data = await this.service.getResourceJsonData(this.id);
    return this.deserializeModel(data ?? { modelId: this.id });
  }

  private async deserializeModel(data: unknown): Promise<ModelState> {
    return {
      entities: serializationToSemanticModelEntities(data),
      operations: [], // todo still no operations
    };
  }

  /**
   * A semantic model must always contain an entity of type
   * {@link LOCAL_SEMANTIC_MODEL} representing the model itself (see
   * {@link semanticModelEntitiesToSerialization}, which throws without it) -
   * even when it otherwise has no entities.
   */
  protected override createNewInternal(): Operation[] {
    return [createSetEntityOperation({ id: this.id, type: [LOCAL_SEMANTIC_MODEL] })];
  }

  protected override applyOperation(operation: Operation, mutableState: EntityRecord): void {
    applyOperationsToSemanticModel(mutableState, [operation]);
  }
}

export function createSemanticModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): Model & ModelInDefaultFrontendModelStore {
  return new SemanticModelInModelStore(modelId, context.service);
}
