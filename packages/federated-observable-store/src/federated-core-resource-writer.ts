import {CoreOperation, CoreOperationResult} from "@dataspecer/core/core";

/**
 * This is temporary interface until {@link CoreResourceWriter} is reimplemented
 * according to https://github.com/dataspecer/dataspecer/issues/151
 */
export interface FederatedCoreResourceWriter {
  applyOperation(schema: string, operation: CoreOperation): CoreOperationResult;
}

