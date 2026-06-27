import type { CoreOperationAndOperation } from "@dataspecer/core/core/index";
import type { Operation } from "@dataspecer/core/operation";

export function isStructureOperation(operation: Operation): operation is CoreOperationAndOperation {
  return (operation as any)["types"] !== undefined;
}

export type ModelKind = "semantic" | "structure";

export interface ModelRef {
  iri: string;
  alias: string;
  kind: ModelKind;
}

export type ProposedOperationStatus = "pending" | "applied" | "skipped";

/**
 * An operation proposed by the tool to bring another model in sync with a
 * pending change. The user decides whether to apply it.
 */
export interface ProposedOperation {
  id: string;
  targetModel: ModelRef;
  operation: Operation;
}

/**
 * A single change that happened in one model and that has not yet been
 * propagated to the other models of the specification.
 */
export interface PendingChange {
  id: string;
  sourceModel: ModelRef;
  occurredAt: string;
  summary: string;
  operation: Operation;
  proposedOperations: ProposedOperation[];
}
