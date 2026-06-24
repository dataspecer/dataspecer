import type { Operation as SemanticOperation } from "@dataspecer/core-v2/semantic-model/operations";
import type { CoreOperation } from "@dataspecer/core/core";

/**
 * Operation performed on a data-psm (structure) model. All such operations
 * are instances of {@link CoreOperation} subclasses defined in
 * `@dataspecer/core/data-psm/operation`.
 */
export type StructureOperation = CoreOperation;

export type AnyOperation = SemanticOperation | StructureOperation;

/**
 * A structure operation is a class instance carrying its type(s) in the
 * `types` array, while a semantic operation is a plain object with a single
 * `type` string. This is enough to tell them apart for rendering purposes.
 */
export function isStructureOperation(operation: AnyOperation): operation is StructureOperation {
  return Array.isArray((operation as StructureOperation).types);
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
  operation: AnyOperation;
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
  operation: AnyOperation;
  proposedOperations: ProposedOperation[];
}
