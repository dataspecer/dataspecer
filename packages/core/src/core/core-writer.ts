import type { Operation } from "../operation/index.ts";
import { DataPsmOperationResult } from "../data-psm/operation/data-psm-operation-result.ts";

export interface CoreResourceWriter {
  /**
   * Apply given event and return IRIs of changed resources.
   */
  applyOperation(operation: Operation): DataPsmOperationResult;
}
