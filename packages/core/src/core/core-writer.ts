import { CoreOperation, CoreOperationResult } from "./operation/index.ts";

export interface CoreResourceWriter {
  /**
   * Apply given event and return IRIs of changed resources.
   */
  applyOperation(operation: CoreOperation): CoreOperationResult;
}
