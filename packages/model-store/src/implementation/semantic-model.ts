import type { PackageService } from "@dataspecer/core-v2/project";
import { applyOperationsToSemanticModel, serializationToSemanticModelEntities } from "@dataspecer/core-v2/semantic-model";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { type Operation } from "@dataspecer/core/operation";
import type { ModelInModelStore, StateResult } from "./interface.ts";
import { createStateResult } from "./state.ts";

/**
 * This class implements support for semantic model for DefaultFrontendModelStore.
 */
export class SemanticModelInModelStore implements ModelInModelStore {
  private readonly id: ModelIdentifier;
  private readonly service: PackageService;

  private state: EntityRecord = {};

  constructor(id: ModelIdentifier, service: PackageService) {
    this.id = id;
    this.service = service;
  }

  setState(coreState: EntityRecord): StateResult {
    const result = createStateResult(this.state, coreState);
    this.state = coreState;
    return result;
  }

  applyOperationAndSetState(operations: Operation[]): StateResult {
    const state = { ...this.state };
    const { changes: diff } = applyOperationsToSemanticModel(state, operations);
    this.state = state;
    return {
      coreState: state,
      outputState: state,
      diff,
    };
  }

  subscribeForAsyncChanges(): () => void {
    return () => {};
  }

  async getRemoteState(): Promise<EntityRecord> {
    const data = await this.service.getResourceJsonData(this.id);
    return serializationToSemanticModelEntities(data ?? { modelId: this.id });
  }
}

export function createSemanticModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): SemanticModelInModelStore {
  return new SemanticModelInModelStore(modelId, context.service);
}
