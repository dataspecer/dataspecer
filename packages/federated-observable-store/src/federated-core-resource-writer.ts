import type { Operation } from "@dataspecer/core/operation";

export interface FederatedCoreResourceWriter {
  applyOperation(schema: string, operation: Operation): void;
}
