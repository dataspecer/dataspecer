import {
  CmeCreateContext,
  CmeOperation,
  CmeOperationArguments,
  CmeOperationExecutionFailed,
  CmeOperationFailure,
  CmeOperationIgnored,
  CmeOperationResult,
  CmeOperationSuccess,
  CmeTypedArguments,
} from "./operation";

/**
 * Operations to execute together, in the given order.
 * The executor stops at the first failed operation,
 * remaining operations are ignored.
 *
 * There is no rollback, operations executed before the failure
 * stay applied.
 *
 * Use {@link CmeOperationBatchBuilder} to create a batch.
 */
export interface CmeOperationBatch<
  ArgumentTypes extends CmeOperationArguments[],
> {

  operations: ArgumentTypes;

}

export function isCmeOperationBatch(
  value: unknown,
): value is CmeOperationBatch<CmeOperationArguments[]> {
  return typeof value === "object" && value !== null
    && Array.isArray((value as { operations?: unknown }).operations);
}

/**
 * Outcome of a batch execution.
 * When the exception is undefined, all operations succeeded
 * and the results are typed.
 * Otherwise the exception is the one of the failed operation,
 * operations after it are ignored.
 */
export type CmeOperationBatchOutcome<
  ArgumentTypes extends CmeOperationArguments[],
> = {

  exception?: undefined;

  results: { [Index in keyof ArgumentTypes]: SuccessOf<ArgumentTypes[Index]> };

} | {

  exception: CmeOperationExecutionFailed;

  results: { [Index in keyof ArgumentTypes]: AnyOutcomeOf<ArgumentTypes[Index]> };

};

type SuccessOf<ArgumentType> =
  ArgumentType extends CmeOperationArguments
    ? CmeOperationSuccess<ArgumentType> : never;

type AnyOutcomeOf<ArgumentType> =
  ArgumentType extends CmeOperationArguments
    ? CmeOperationSuccess<ArgumentType>
    | CmeOperationFailure<ArgumentType>
    | CmeOperationIgnored<ArgumentType>
    : never;

/**
 * Immutable builder, each call returns a new builder.
 *
 * @example
 * const batch = executor.batch()
 *   .add(cmeOperations.createSemanticClass, { ... })
 *   .build();
 * const outcome = await executor.execute(batch);
 * if (outcome.exception === undefined) {
 *   console.log(outcome.results[0].created);
 * }
 */
export class CmeOperationBatchBuilder<
  ArgumentTypes extends CmeOperationArguments[] = [],
> {

  private readonly context: CmeCreateContext;

  private readonly operations: ArgumentTypes;

  constructor(context: CmeCreateContext, operations?: ArgumentTypes) {
    this.context = context;
    this.operations = operations ?? ([] as CmeOperationArguments[] as ArgumentTypes);
  }

  /**
   * Create arguments for given operation and add them to the batch.
   */
  add<
    ArgumentType extends CmeOperationArguments,
    ResultType extends CmeOperationResult<ArgumentType>,
    ParametersType,
  >(
    operation: CmeOperation<ArgumentType, ResultType, ParametersType>,
    parameters: NoInfer<ParametersType>,
  ): CmeOperationBatchBuilder<
    [...ArgumentTypes, CmeTypedArguments<ArgumentType, ResultType>]> {
    return this.addArguments(operation.create(this.context, parameters));
  }

  /**
   * Add already created arguments to the batch.
   */
  addArguments<ArgumentType extends CmeOperationArguments>(
    args: ArgumentType,
  ): CmeOperationBatchBuilder<[...ArgumentTypes, ArgumentType]> {
    return new CmeOperationBatchBuilder(
      this.context, [...this.operations, args]);
  }

  build(): CmeOperationBatch<ArgumentTypes> {
    return { operations: [...this.operations] as ArgumentTypes };
  }

}
