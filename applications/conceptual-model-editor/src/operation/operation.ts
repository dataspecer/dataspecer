/**
 * Warning this file contains some Typescript stuff co-created with AI.
 * The idea is to pair operation arguments and results together, so when
 * user executed operation they get access to the results.
 */
import { ProfileModel } from "@dataspecer/profile-model";
import { SemanticModel } from "@dataspecer/semantic-model";
import { VisualModel } from "@dataspecer/visual-model";
import { EntityDsIdentifier, ModelDsIdentifier } from "../dataspecer/entity-model";

/**
 * Definition of an operation.
 *
 * Use {@link create} to prepare the operation arguments,
 * pass the arguments to {@link CmeOperationExecutor.execute} to execute them.
 * The executor finds the operation using the arguments type.
 *
 * Methods use the method syntax on purpose, so operations with different
 * argument types can be stored together, see cmeOperations.
 */
export interface CmeOperation<
  ArgumentType extends CmeOperationArguments,
  ResultType extends CmeOperationResult<ArgumentType>,
  ParametersType = Omit<ArgumentType, "type">,
> {

  /**
   * Operation metadata.
   */
  metadata: {

    type: ArgumentType["type"];

  };

  /**
   * Prepare and return operation arguments.
   * The returned arguments carry the result type,
   * so the executor returns typed result.
   *
   * Identifiers of created entities should be prepared here,
   * so the arguments fully determine the result of the execution.
   */
  create(
    context: CmeCreateContext,
    parameters: ParametersType,
  ): CmeTypedArguments<ArgumentType, ResultType>;

  /**
   * Execute instance of this operation.
   * Do not call directly, use {@link CmeOperationExecutor} instead.
   *
   * @throws CmeOperationExecutionFailed When operation fails.
   */
  execute(context: CmeExecutionContext, args: ArgumentType): Promise<ResultType>;

}

/**
 * Operation arguments which carry the result type of the operation.
 * The result type is only on the type level, so the arguments
 * stay a plain serializable object.
 */
export type CmeTypedArguments<
  ArgumentType extends CmeOperationArguments,
  ResultType extends CmeOperationResult<ArgumentType>,
> = ArgumentType & {

  readonly [CmeOperationResultKey]?: ResultType;

};

/**
 * Base interface of any operation arguments.
 */
export interface CmeOperationArguments {

  type: string;

}

/**
 * Base interface for an operation results.
 * The result of the operation also contains the arguments so it can be
 * stored as a single package.
 *
 * This is the result of a successful execution,
 * failures are reported using {@link CmeOperationFailure}.
 */
export interface CmeOperationResult<ArgumentType> {

  args: ArgumentType;

}

/**
 * Type-only key, there is no runtime value.
 */
declare const CmeOperationResultKey: unique symbol;

/**
 * Result type of given operation arguments.
 * Falls back to {@link CmeOperationResult} for arguments without a result type.
 */
export type CmeOperationResultOf<ArgumentType extends CmeOperationArguments> =
  ArgumentType extends { readonly [CmeOperationResultKey]?: infer ResultType }
    ? (unknown extends ResultType ? CmeOperationResult<ArgumentType> : ResultType)
    : CmeOperationResult<ArgumentType>;

/**
 * Returned by the executor when the operation succeeds.
 */
export type CmeOperationSuccess<ArgumentType extends CmeOperationArguments> =
  CmeOperationResultOf<ArgumentType> & {

    status: "success";

    exception?: undefined;

  };

/**
 * Returned by the executor when the operation fails.
 */
export interface CmeOperationFailure<ArgumentType> {

  status: "failed";

  args: ArgumentType;

  exception: CmeOperationExecutionFailed;

}

/**
 * Returned by the executor for operations of a batch,
 * which were not executed because a previous operation failed.
 */
export interface CmeOperationIgnored<ArgumentType> {

  status: "ignored";

  args: ArgumentType;

  exception?: undefined;

}

/**
 * Outcome of an operation execution.
 * Check the exception property to tell the cases apart,
 * on success the result properties are available.
 */
export type CmeOperationOutcome<ArgumentType extends CmeOperationArguments> =
  CmeOperationSuccess<ArgumentType>
  | CmeOperationFailure<ArgumentType>;

/**
 * Base error class to use by operations to report failure.
 */
export class CmeOperationExecutionFailed extends Error { }

/**
 * Context given to {@link CmeOperation.create}.
 *
 * There is no access to the models on purpose.
 * The arguments can be created before other operations are executed,
 * so any model state read here could be outdated.
 */
export interface CmeCreateContext {

  /**
   * Create and return new identifier for an entity in given model.
   */
  createEntityIdentifier(model: ModelDsIdentifier): EntityDsIdentifier;

}

/**
 * Context given to {@link CmeOperation.execute}.
 */
export interface CmeExecutionContext {

  semanticModels: Record<ModelDsIdentifier, SemanticModel>;

  profileModels: Record<ModelDsIdentifier, ProfileModel>;

  visualModels: Record<ModelDsIdentifier, VisualModel>;

  /**
   * Create and return new identifier for an entity.
   * Use only for entities which can not be known in
   * {@link CmeOperation.create}, as they depend on the model state.
   */
  createNewEntityIdentifier(model: ModelDsIdentifier): EntityDsIdentifier;

}

export class MissingCmeExecutor extends CmeOperationExecutionFailed { }

export class MissingModel extends CmeOperationExecutionFailed { }

export class ModelIsNotWritable extends CmeOperationExecutionFailed {}

export class DataspecerOperationFailed extends CmeOperationExecutionFailed {}

export class MissingEntity extends CmeOperationExecutionFailed {}

export class InvalidEntity extends CmeOperationExecutionFailed {}

export class InvalidOperationArguments extends CmeOperationExecutionFailed {}
