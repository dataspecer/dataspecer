import type { PackageService } from "@dataspecer/core-v2/project";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { serializationToVisualModelEntities } from "@dataspecer/visual-model";
import { applyOperationsToVisualModel } from "@dataspecer/visual-model/executor";
import type { ModelInModelStore, StateResult } from "./interface.ts";
import { createStateResult } from "./state.ts";

/**
 * Since there is a mismatch between the old visual model entity interface (with
 * `identifier`) and the new core entity interface (with `id`), this class can
 * handle both interfaces during the transition period.
 */
export class VisualModelInModelStore implements ModelInModelStore {
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
    const diff = applyOperationsToVisualModel(state, operations);
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
    return data ? serializationToVisualModelEntities(data) : {};
  }
}

export function createVisualModelInModelStore(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): VisualModelInModelStore {
  return new VisualModelInModelStore(modelId, context.service);
}
