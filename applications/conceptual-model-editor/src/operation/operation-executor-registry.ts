import { SemanticModel } from "@dataspecer/semantic-model";
import { ProfileModel } from "@dataspecer/profile-model";
import { VisualModel } from "@dataspecer/core-v2/visual-model";

import { CmeOperation, CmeOperationResult } from "./operation";

/**
 * @throws CommandFailed
 */
export type CmeOperationSpecificExecutor<
  OperationType extends CmeOperation,
  ResultType extends CmeOperationResult<OperationType>,
> = (
  context: CmeOperationContext,
  operation: OperationType,
) => Promise<ResultType>;

export interface CmeOperationContext {

  semanticModels: SemanticModel[];

  profileModels: ProfileModel[];

  visualModels: VisualModel[];

}

type DefaultExecutor = CmeOperationSpecificExecutor<
  CmeOperation, CmeOperationResult<CmeOperation>>;

const registry: {
  [type: string]: {
    executor: DefaultExecutor,
    label: string,
    description: string,
  }
} = {};

/**
 * Register operation executor for operation of the given type.
 */
export function registerCmeOperationExecutor<
  OperationType extends CmeOperation,
  ResultType extends CmeOperationResult<OperationType>,
>(
  type: string,
  executor: CmeOperationSpecificExecutor<OperationType, ResultType>,
  label: string,
  description: string,
): void {
  registry[type] = {
    executor: executor as unknown as DefaultExecutor,
    label,
    description,
  };
}

export function registeredCmeOperationExecutors() {
  return Object.freeze(registry);
}
