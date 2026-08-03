import type { PackageService } from "@dataspecer/core-v2/project";
import { type CoreResourceAndEntity } from "@dataspecer/core/core";
import { applyOperationsToStructureModel, serializationToStructureModelEntities } from "@dataspecer/core/data-psm";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { type Operation } from "@dataspecer/core/operation";
import type { ModelInModelStore, StateResult } from "./interface.ts";
import { createStateResult } from "./state.ts";

/**
 * Currently, the structure model is PSM. This will be changed in the future,
 * but we will already call it properly to avoid refactoring in the future.
 */
export class StructureModelInModelStore implements ModelInModelStore {
  private readonly id: ModelIdentifier;
  private readonly service: PackageService;

  private state: EntityRecord<CoreResourceAndEntity> = {};

  constructor(id: ModelIdentifier, service: PackageService) {
    this.id = id;
    this.service = service;
  }

  setState(coreState: EntityRecord): StateResult {
    const result = createStateResult(this.state, coreState);
    this.state = coreState as EntityRecord<CoreResourceAndEntity>;
    return result;
  }

  applyOperationAndSetState(operations: Operation[]): StateResult {
    const coreState = { ...this.state };
    const diff = applyOperationsToStructureModel(coreState, operations);
    this.state = coreState;
    return {
      coreState,
      outputState: coreState,
      diff,
    };
  }

  subscribeForAsyncChanges(): () => void {
    return () => {};
  }

  async getRemoteState(): Promise<EntityRecord> {
    const data = await this.service.getResourceJsonData(this.id);
    return data ? serializationToStructureModelEntities(data).entities : {};
  }
}

export function createStructureModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): StructureModelInModelStore {
  return new StructureModelInModelStore(modelId, context.service);
}
