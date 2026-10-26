import type { Operation } from "../../operation/index.ts";
import {CoreOperationExecutor} from "../executor/index.ts";
import {assert} from "../utilities/assert.ts";

export function createExecutorMap(executors: CoreOperationExecutor<Operation>[]) {
  const executorForTypes: ExecutorMap = {};
  executors.forEach((executor) => {
    assert(
      executorForTypes[executor.type] === undefined,
      `Only one executor can be declared for given type '${executor.type}'`
    );
    executorForTypes[executor.type] = executor;
  });
  return executorForTypes;
}

export type ExecutorMap = { [type: string]: CoreOperationExecutor<Operation> };
