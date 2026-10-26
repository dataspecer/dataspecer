import { serializationToControlledVocabularyModelEntities } from "@dataspecer/controlled-vocabulary-model";
import type { PackageService } from "@dataspecer/core-v2/project";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier } from "@dataspecer/core/model";
import { type Operation } from "@dataspecer/core/operation";
import { applyOperationsToBlobModel } from "./blob-model.ts";
import type { ModelInModelStore, StateResult } from "./interface.ts";
import { createStateResult } from "./state.ts";

/**
 * This class implements support for the controlled vocabulary model for
 * DefaultFrontendModelStore. A controlled vocabulary model has exactly one
 * entity - the vocabulary itself, identified by the model's own id - so it accepts
 * only the generic Set/Update-entity operations, same as a blob model
 * ({@link applyOperationsToBlobModel} is reused directly for this). Unlike a
 * blob model, reading preserves the entity's real type instead of discarding
 * it, via {@link serializationToControlledVocabularyModelEntities}.
 */
export class ControlledVocabularyInModelStore implements ModelInModelStore {
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
    const diff = applyOperationsToBlobModel(this.id, state, operations);
    this.state = state;
    return {
      coreState: state,
      outputState: state,
      diff,
    };
  }

  subscribeForAsyncChanges(): () => void {
    // No-op: this hook is for state that changes from outside the operation flow
    // A controlled vocabulary model's only entity only ever changes via
    // applyOperationAndSetState (operations) or setState (reload), so there
    // is nothing external to subscribe to.
    return () => {};
  }

  async getRemoteState(): Promise<EntityRecord> {
    const data = await this.service.getResourceJsonData(this.id);
    return serializationToControlledVocabularyModelEntities(this.id, data);
  }
}

export function createControlledVocabularyModel(
  modelId: ModelIdentifier,
  context: {
    service: PackageService;
  },
): ControlledVocabularyInModelStore {
  return new ControlledVocabularyInModelStore(modelId, context.service);
}
