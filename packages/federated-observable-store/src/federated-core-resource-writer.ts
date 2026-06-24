import { CoreOperation } from "@dataspecer/core/core";

export interface FederatedCoreResourceWriter {
  applyOperation(schema: string, operation: CoreOperation): void;
}
