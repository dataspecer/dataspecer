import { EntityModel } from "@dataspecer/core-v2";
import { VisualModel } from "@dataspecer/core-v2/visual-model";

import { CmeOperationExecutor } from "./operation-executor-api";
import {
  CmeOperationContext,
  registeredCmeOperationExecutors,
} from "./operation-executor-registry";
import { UnknownOperation } from "./operation";
import { isInMemorySemanticModel } from "../dataspecer/semantic-model";

export function createCmeOperationExecutor(
  entityModels: EntityModel[],
  visualModels: VisualModel[],
): CmeOperationExecutor {
  const context: CmeOperationContext = {
    semanticModels: entityModels.map(wrapLegacyEntityModel),
    profileModels: entityModels.map(wrapLegacyEntityModel),
    visualModels
  };
  const registry = registeredCmeOperationExecutors();
  //
  return {
    execute: (operation) => {
      const executor = registry[operation.type];
      if (executor === undefined) {
        throw new UnknownOperation();
      }
      return executor.executor(context, operation) as any;
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
