import {
  CmeOperationArguments, CmeOperationExecutor, CmeOperationResultOf,
} from "./operation";

export const cmeOperationExecutorRegistry: CmeOperationExecutorRegistry =
  (() => {

    const registry: { [type: string]: RegistryEntry } = {};

    return {
      register(type, _factory, executor) {
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
   *
   * The factory is used only to check types, it is not called.
   * The type must match the type produced by the factory, and the executor
   * must accept the factory arguments and return the result type
   * declared by the factory.
   */
  register<OperationType extends CmeOperationArguments>(
    type: OperationType["type"],
    factory: (...args: any[]) => OperationType,
    executor: CmeOperationExecutor<
      OperationType, CmeOperationResultOf<OperationType>>,
  ): void;

  /**
   * Returns operation executor for given type.
   */
  get(type: string): RegistryEntry | undefined;

}

export interface RegistryEntry {

  executor: CmeOperationExecutor<any, any>;

}
