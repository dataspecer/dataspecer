import { EntityModel } from "@dataspecer/core-v2";
import { VisualModel } from "@dataspecer/visual-model";

import {
  CmeExecutionContext,
  registeredCmeOperationExecutors,
} from "./operation-registry";
import { CmeOperationExecutor, UnknownCmeOperation } from "./operation";
import { isInMemorySemanticModel } from "../dataspecer/semantic-model";

export function createCmeOperationExecutor(
  entityModels: EntityModel[],
  visualModels: VisualModel[],
): CmeOperationExecutor {

  const context: CmeExecutionContext = {
    semanticModels: entityModels.map(wrapLegacyEntityModel),
    profileModels: entityModels.map(wrapLegacyEntityModel),
    visualModels,
  };

  const registry = registeredCmeOperationExecutors();
  //
  return {
    execute: async (operation) => {
      const executor = registry[operation.type];
      if (executor === undefined) {
        throw new UnknownCmeOperation();
      }
      const result = await executor.executor(context, operation);
      console.info("[OPERATION]", result);
      return result;
    },
  };
}

function wrapLegacyEntityModel(model: EntityModel): any {
  if (isInMemorySemanticModel(model)) {
    return model;
  }
  // We patch the implementation with getBaseIri method.
  if ((model as any).getBaseIri === undefined) {
    (model as any).getBaseIri = () => null;
  }
  return model;
}
