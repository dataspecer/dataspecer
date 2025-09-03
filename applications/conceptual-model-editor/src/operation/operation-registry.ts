import { SemanticModel } from "@dataspecer/semantic-model";
import { ProfileModel } from "@dataspecer/profile-model";
import { VisualModel } from "@dataspecer/core-v2/visual-model";

import { CmeOperationArguments, CmeOperationResult } from "./operation";


export interface CmeExecutionContext {

  semanticModels: SemanticModel[];

  profileModels: ProfileModel[];

  visualModels: VisualModel[];

}

export type InternalExecutor<
  ArgumentType extends CmeOperationArguments,
  ResultType extends CmeOperationResult<ArgumentType>,
> = (
  context: CmeExecutionContext,
  args: ArgumentType,
) => Promise<ResultType>;

interface RegistryEntry {

  executor: InternalExecutor<any, any>;

  label: string;

  description: string;

}

const registry: { [type: string]: RegistryEntry } = {};

/**
 * Register operation executor for operation of the given type.
 */
export function register<
  ArgumentType extends CmeOperationArguments,
  ResultType extends CmeOperationResult<ArgumentType>,
>(
  type: string,
  executor: InternalExecutor<ArgumentType, ResultType>,
  label: string,
  description: string,
): void {
  registry[type] = {
    executor,
    label,
    description,
  };
}

export function registeredCmeOperationExecutors() {
  return Object.freeze(registry);
}
