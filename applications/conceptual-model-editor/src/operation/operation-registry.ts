import { CmeOperationArguments, CmeOperationExecutor, CmeOperationResult } from "./operation";

export const cmeOperationExecutorRegistry: CmeOperationExecutorRegistry =
  (() => {

    const registry: { [type: string]: RegistryEntry } = {};

    return {
      register(type, executor) {
        registry[type] = { executor };
      },
      get(type) {
        return registry[type];
      },
    }

  })();

interface CmeOperationExecutorRegistry {

  /**
   * Register new operation executor for given type.
   */
  register<
    ArgumentType extends CmeOperationArguments,
    ResultType extends CmeOperationResult<ArgumentType>,
  >(
    type: string,
    executor: CmeOperationExecutor<ArgumentType, ResultType>,
  ): void;

  /**
   * Returns operation executor for given type.
   */
  get(type: string): RegistryEntry | undefined;

}

export interface RegistryEntry {

  executor: CmeOperationExecutor<any, any>;

}
