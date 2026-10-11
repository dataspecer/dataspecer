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
 * Operation arguments which carry the result type of the operation.
 * The result type is only on the type level, so the arguments
 * stay a plain serializable object.
 *
 * Operation factory functions should return this type,
 * so {@link CmeOperationsExecutor.execute} can return a typed result.
 */
export type CmeOperation<
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
 * Returned by the executor when the operation fails.
 */
export interface CmeOperationFailure<ArgumentType> {

  args: ArgumentType;

  exception: CmeOperationExecutionFailed;

}

/**
 * Outcome of an operation execution.
 * Check the exception property to tell the cases apart,
 * on success the result properties are available.
 */
export type CmeOperationOutcome<ArgumentType extends CmeOperationArguments> =
  (CmeOperationResultOf<ArgumentType> & { exception?: undefined })
  | CmeOperationFailure<ArgumentType>;

/**
 * Base error class to use by operations to report failure.
 */
export class CmeOperationExecutionFailed extends Error { }

/**
 * Each operation has assigned executor.
 */
export interface CmeOperationExecutor<
  ArgumentType extends CmeOperationArguments,
  ResultType extends CmeOperationResult<ArgumentType>,
> {

  /**
   * @throws CmeOperationExecutionFailed When operation fails.
   */
  execute: (context: CmeExecutionContext, args: ArgumentType)
    => Promise<ResultType>;

}

/**
 * Context given to each executor.
 */
export interface CmeExecutionContext {

  semanticModels: Record<ModelDsIdentifier, SemanticModel>;

  profileModels: Record<ModelDsIdentifier, ProfileModel>;

  visualModels: Record<ModelDsIdentifier, VisualModel>;

  /**
   * Create and return new identifier for an entity.
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
