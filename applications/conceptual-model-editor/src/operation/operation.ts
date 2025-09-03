import { ModelDsIdentifier } from "@/dataspecer/entity-model";

export interface CmeOperationArguments {

  type: string

}

export interface CmeOperationResult<OperationType> {

  args: OperationType,

}

/**
 * Operation is a tuple of arguments and results.
 */
export type CmeOperationTuple<
  ArgumentType extends CmeOperationArguments,
  ResultType extends CmeOperationResult<ArgumentType>
> = [ArgumentType, ResultType];

export interface CmeOperationExecutor {

  /**
   * @throws CmeOperationExecutionFailed
   */
  execute: <Type extends CmeOperationTuple<any, any>>(
    args: Type[0]
  ) => Promise<Type[1]>;

}

export class CmeOperationExecutionFailed extends Error { }

/**
 * There is no operation for given operation.
 */
export class UnknownCmeOperation extends CmeOperationExecutionFailed { }

/**
 * There is no model with given identifier.
 */
export class MissingModel extends CmeOperationExecutionFailed {

  constructor(models: any, identifier: ModelDsIdentifier) {
    super();
    console.error("Missing model.", { models, identifier });
  }

}

/**
 * Model exists but is not of an expected type.
 */
export class InvalidModel extends CmeOperationExecutionFailed { }

/**
 * Use when Dataspecer call failed.
 */
export class DataspecerOperationFailed extends CmeOperationExecutionFailed { }

