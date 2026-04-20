import type { EntityChange } from "@dataspecer/core/entity-model";
import type { Model, ModelIdentifier } from "@dataspecer/core/model";
import type { Operation } from "@dataspecer/core/operation";
import { v7 as uuidv7 } from "uuid";
import type { ApplyOperationResult, ModelInDefaultFrontendModelStore } from "./implementation.ts";
import type { PackageService } from "@dataspecer/core-v2/project";

export class AsyncQueryableModelInModelStore implements Model, ModelInDefaultFrontendModelStore {
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  applyOperations(operations: Operation[]): ApplyOperationResult {
    console.warn("SGOV semantic model operation application is not implemented yet.", operations);
    return {
      entityChanges: [],
      transactionId: uuidv7(),
    };
  }

  subscribeForAsyncChanges(listener: (changeEvent: EntityChange[]) => void): () => void {
    return () => listener;
  }

  async load(): Promise<void> {
    return;
  }

  async save(): Promise<void> {
    return;
  }
}

export function createAsyncQueryableModel(modelId: ModelIdentifier, context: {
  service: PackageService;
}): Model & ModelInDefaultFrontendModelStore {
  return new AsyncQueryableModelInModelStore(modelId, context.service);
}
