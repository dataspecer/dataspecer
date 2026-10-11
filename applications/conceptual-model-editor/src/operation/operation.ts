import { ProfileModel } from "@dataspecer/profile-model";
import { SemanticModel } from "@dataspecer/semantic-model";
import { VisualModel } from "@dataspecer/visual-model";
import { EntityDsIdentifier, ModelDsIdentifier } from "../dataspecer/entity-model";

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
 */
export interface CmeOperationResult<ArgumentType> {

  args: ArgumentType;

  /**
   * Undefined if operation has passed.
   */
  exception?: CmeOperationExecutionFailed;

}

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
