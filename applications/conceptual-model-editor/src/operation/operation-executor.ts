import { EntityModel } from "@dataspecer/core-v2";
import { VisualModel } from "@dataspecer/visual-model";

import { isInMemorySemanticModel } from "../dataspecer/semantic-model";
import {
  CmeCreateContext, CmeExecutionContext, CmeOperation, CmeOperationArguments, CmeOperationExecutionFailed,
  CmeOperationIgnored, CmeOperationOutcome, MissingCmeExecutor,
} from "./operation";
import {
  CmeOperationBatch, CmeOperationBatchBuilder, CmeOperationBatchOutcome,
  isCmeOperationBatch,
} from "./operation-batch";
import { EntityDsIdentifier } from "../dataspecer/entity-model";

/**
 * @param operations Operations the executor can execute, use cmeOperations.
 * @throws Error When two operations share the same type.
 */
export function createCmeOperationExecutor(
  operations: Record<string, CmeOperation<any, any, any>>,
  entityModels: EntityModel[],
  visualModels: VisualModel[],
  createNewEntityIdentifier: () => EntityDsIdentifier,
): CmeOperationExecutor {
  const operationsByType = createOperationsByType(operations);

  const entityModelRecord = Object.fromEntries(
    entityModels.map(model => [model.getId(), wrapLegacyEntityModel(model)]));

  const context: CmeExecutionContext = {
    semanticModels: entityModelRecord,
    profileModels: entityModelRecord,
    visualModels: Object.fromEntries(
      visualModels.map(model => [model.getIdentifier(), model])),
    createNewEntityIdentifier,
  };
  const createContext: CmeCreateContext = {
    createEntityIdentifier: () => createNewEntityIdentifier(),
  };

  const executeSingle = async (
    args: CmeOperationArguments,
  ): Promise<CmeOperationOutcome<CmeOperationArguments>> => {
    const operation = operationsByType.get(args.type);
    if (operation === undefined) {
      return { status: "failed", args, exception: new MissingCmeExecutor() };
    }
    try {
      const result = await operation.execute(context, args);
      return { ...result, status: "success" };
    } catch (exception) {
      return { status: "failed", args, exception: asExecutionFailed(exception) };
    }
  };

  const executeBatch = async (
    batch: CmeOperationBatch<CmeOperationArguments[]>,
  ): Promise<CmeOperationBatchOutcome<CmeOperationArguments[]>> => {
    const results: AnyOutcome[] = [];
    let exception: CmeOperationExecutionFailed | undefined = undefined;
    for (const args of batch.operations) {
      if (exception !== undefined) {
        results.push({ status: "ignored", args });
        continue;
      }
      const outcome = await executeSingle(args);
      results.push(outcome);
      exception = outcome.exception;
    }
    return { exception, results } as CmeOperationBatchOutcome<CmeOperationArguments[]>;
  };

  return {
    createContext,
    // Implementation of the overloads, the types are checked by the interface.
    execute: ((value: CmeOperationArguments | CmeOperationBatch<CmeOperationArguments[]>) =>
      isCmeOperationBatch(value) ? executeBatch(value) : executeSingle(value)
    ) as CmeOperationExecutor["execute"],
    batch: () => new CmeOperationBatchBuilder(createContext),
  };
}

/**
 * @throws Error When two operations share the same type.
 */
function createOperationsByType(
  operations: Record<string, CmeOperation<any, any, any>>,
): Map<string, CmeOperation<any, any, any>> {
  const result = new Map<string, CmeOperation<any, any, any>>();
  for (const operation of Object.values(operations)) {
    const type = operation.metadata.type;
    if (result.has(type)) {
      throw new Error(`Duplicate operation type '${type}'.`);
    }
    result.set(type, operation);
  }
  return result;
}

type AnyOutcome =
  CmeOperationOutcome<CmeOperationArguments>
  | CmeOperationIgnored<CmeOperationArguments>;

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

export interface CmeOperationExecutor {

  /**
   * Context to use with {@link CmeOperation.create}.
   */
  readonly createContext: CmeCreateContext;

  /**
   * Executes given operation or batch of operations.
   * This method must never throw.
   *
   * When the arguments are created using {@link CmeOperation.create},
   * or {@link CmeOperationBatchBuilder}, the outcome contains
   * the typed result of the operation.
   */
  execute<ArgumentType extends CmeOperationArguments>(args: ArgumentType):
    Promise<CmeOperationOutcome<ArgumentType>>;

  execute<ArgumentTypes extends CmeOperationArguments[]>(
    batch: CmeOperationBatch<ArgumentTypes>,
  ): Promise<CmeOperationBatchOutcome<ArgumentTypes>>;

  /**
   * Returns empty batch builder using {@link createContext}.
   */
  batch(): CmeOperationBatchBuilder<[]>;

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
