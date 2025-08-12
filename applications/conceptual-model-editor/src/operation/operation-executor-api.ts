import { CmeOperation, CmeOperationResult } from "./operation";

/**
 * Definition of public facing operation executor.
 */
export interface CmeOperationExecutor {

  /**
   * @throws CommandFailed
   */
  execute<
    OperationType extends CmeOperation,
    ResultType extends CmeOperationResult<OperationType>,
  >(operation: OperationType): Promise<ResultType>;

}
