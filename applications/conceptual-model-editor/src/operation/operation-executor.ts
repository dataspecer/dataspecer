import { EntityModel } from "@dataspecer/core-v2";
import { VisualModel } from "@dataspecer/visual-model";

import { isInMemorySemanticModel } from "../dataspecer/semantic-model";
import { RegistryEntry } from "./operation-registry";
import {
  CmeExecutionContext, CmeOperationArguments, CmeOperationResult,
  MissingCmeExecutor,
} from "./operation";
import { EntityDsIdentifier } from "../dataspecer/entity-model";

export function createCmeOperationExecutor(
  registry: {
    get(type: string): RegistryEntry | undefined;
  },
  entityModels: EntityModel[],
  visualModels: VisualModel[],
  createNewEntityIdentifier: () => EntityDsIdentifier,
): CmeOperationsExecutor {
  const entityModelRecord = Object.fromEntries(
    entityModels.map(model => [model.getId(), wrapLegacyEntityModel(model)]));

  const context: CmeExecutionContext = {
    semanticModels: entityModelRecord,
    profileModels: entityModelRecord,
    visualModels: Object.fromEntries(
      visualModels.map(model => [model.getIdentifier(), model])),
    createNewEntityIdentifier,
  };
  //
  return {
    execute: async (args) => {
      const registered = registry.get(args.type);
      if (registered === undefined) {
        return { args, exception: new MissingCmeExecutor() };
      }
      try {
        return await registered.executor.execute(context, args);
      } catch (exception) {
        return { args, exception };
      }
    },
  };
}

export interface CmeOperationsExecutor {

  /**
   * Executes given operation.
   * This method must never throw.
   */
  execute(args: CmeOperationArguments):
    Promise<CmeOperationResult<CmeOperationArguments>>;

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
