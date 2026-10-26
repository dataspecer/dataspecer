import { EntityModel } from "@dataspecer/core-v2";
import { VisualModel } from "@dataspecer/visual-model";

import { isInMemorySemanticModel } from "../dataspecer/semantic-model";
import { RegistryEntry } from "./operation-registry";
import {
  CmeExecutionContext, CmeOperationArguments, CmeOperationExecutionFailed,
  CmeOperationOutcome, MissingCmeExecutor,
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
    execute: async <ArgumentType extends CmeOperationArguments>(
      args: ArgumentType,
    ): Promise<CmeOperationOutcome<ArgumentType>> => {
      const registered = registry.get(args.type);
      if (registered === undefined) {
        return { args, exception: new MissingCmeExecutor() };
      }
      try {
        return await registered.executor.execute(context, args);
      } catch (exception) {
        return { args, exception: asExecutionFailed(exception) };
      }
    },
  };
}

/**
 * Operations should throw only {@link CmeOperationExecutionFailed},
 * anything else is wrapped.
 */
function asExecutionFailed(exception: unknown): CmeOperationExecutionFailed {
  if (exception instanceof CmeOperationExecutionFailed) {
    return exception;
  }
  return new CmeOperationExecutionFailed(
    "Unexpected exception.", { cause: exception });
}

export interface CmeOperationsExecutor {

  /**
   * Executes given operation.
   * This method must never throw.
   *
   * When the arguments are created using an operation factory function,
   * the outcome contains the typed result of the operation.
   */
  execute<ArgumentType extends CmeOperationArguments>(args: ArgumentType):
    Promise<CmeOperationOutcome<ArgumentType>>;

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
