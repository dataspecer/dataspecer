import type { OperationRowProps } from "@/components/operation-row/operation-row";
import { modelTypesFromStore } from "@/lib/model-display";
import { computeModelSnapshots } from "@/lib/model-snapshots";
import {
  collectTransactionVersions,
  createUndoOperation,
  createVersionOperation,
  generateOperationId,
  isUndoOperation,
  resolveCancelledTransactions,
  type Operation,
  type OperationInModel,
  type Transaction,
} from "@dataspecer/core/operation";
import type { DefaultFrontendModelStore } from "@dataspecer/model-store/implementation";

/**
 * Data layer of the history page: the transaction history of the project's
 * main branch fetched from the backend, enriched with the versions marked in
 * it, with the transactions cancelled by undo operations, and with the entity
 * state each operation's model was in just before and after its transaction
 * (see {@link computeModelSnapshots}), plus the actions (undo a transaction,
 * mark a version) that append new transactions to the history.
 */

interface BackendTransaction {
  id: number;
  clientId: string;
  createdAt: string;
  operations: { id: number; modelId: string; order: number; data: Operation }[];
}

/** One transaction of the project history as displayed on the history page. */
export interface HistoryEntry {
  /** Client-generated transaction id, referenced by undo and version operations. */
  clientId: string;
  /** Time the transaction was executed. */
  executedAt: Date;
  operations: OperationRowProps[];
  /** Version labels this transaction is marked with, like git tags. */
  versions: string[];
  /** Models in which the transaction is effectively cancelled by an undo. */
  undoneInModels: Set<string>;
  /** True when the transaction is cancelled in every model it changed. */
  isUndone: boolean;
}

/**
 * Fetches the entire transaction history of the project's main branch,
 * ordered oldest first, and resolves the versions, the undo cancellations and
 * the model state each operation's model was in around its transaction. The
 * store provides the model types and the current entity state the replay is
 * seeded with.
 */
export async function fetchProjectHistory(backendUrl: string, projectIri: string, modelStore: DefaultFrontendModelStore): Promise<HistoryEntry[]> {
  const url = new URL(`${backendUrl}/transactions/log/main`, window.location.origin);
  url.searchParams.set("projectIri", projectIri);
  const response = await fetch(url.toString());
  if (!response.ok) return [];
  const result = (await response.json()) as { transactions: BackendTransaction[] };

  const transactions: Transaction[] = result.transactions.map((transaction) => ({
    id: transaction.clientId,
    operations: transaction.operations.map((operation) => ({ modelId: operation.modelId, operation: operation.data })),
  }));

  const cancelled = resolveCancelledTransactions(transactions);

  // Versions marked by an undone transaction do not count - undoing the
  // marker removes the tag.
  const versionsByTransaction = new Map<string, string[]>();
  for (const version of collectTransactionVersions(transactions)) {
    if (cancelled.has(version.markerTransactionId)) continue;
    versionsByTransaction.set(version.versionedTransactionId, [...(versionsByTransaction.get(version.versionedTransactionId) ?? []), version.version]);
  }

  const snapshots = computeModelSnapshots(transactions, modelTypesFromStore(modelStore), modelStore.projectModelId);

  return result.transactions.map((transaction, index) => {
    const operations = transactions[index]!.operations.map((operation, operationIndex): OperationRowProps => {
      const snapshot = snapshots[index]![operationIndex]!;
      return { ...operation, ...snapshot, contextBefore: snapshot.before, contextAfter: snapshot.after };
    });
    const undoneInModels = cancelled.get(transaction.clientId) ?? new Set<string>();
    const changedModels = new Set(operations.filter(({ operation }) => !isUndoOperation(operation)).map(({ modelId }) => modelId));
    return {
      clientId: transaction.clientId,
      executedAt: new Date(transaction.createdAt),
      operations,
      versions: versionsByTransaction.get(transaction.clientId) ?? [],
      undoneInModels,
      isUndone: changedModels.size > 0 && [...changedModels].every((modelId) => undoneInModels.has(modelId)),
    };
  });
}

/**
 * Appends transactions to the project history: the backend interprets their
 * operations (including undo operations, against the recorded history) and
 * updates the stored models.
 *
 * The history page talks to the backend directly instead of going through the
 * local model store: the store can only interpret undo of transactions it has
 * seen itself, while the backend interprets undo of any recorded transaction.
 * The local models become stale; the caller should refetch afterwards.
 */
async function applyHistoryTransactions(backendUrl: string, projectIri: string, transactions: Transaction[]): Promise<void> {
  const url = new URL(`${backendUrl}/transactions/apply`, window.location.origin);
  url.searchParams.set("projectIri", projectIri);
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions }),
  });
  if (!response.ok) {
    throw new Error(`Failed to apply transactions, status ${response.status}.`);
  }
}

/**
 * Cancels the given transaction: dispatches an undo operation to every model
 * the transaction touched, committed together as one new transaction.
 * Cancelling a transaction that itself contains undo operations re-applies
 * what those undos cancelled (redo).
 */
export async function undoHistoryTransaction(backendUrl: string, projectIri: string, entry: HistoryEntry): Promise<void> {
  const modelIds = [...new Set(entry.operations.map(({ modelId }) => modelId))];
  const operations: OperationInModel[] = modelIds.map((modelId) => ({ modelId, operation: createUndoOperation(entry.clientId) }));
  await applyHistoryTransactions(backendUrl, projectIri, [{ id: generateOperationId(), time: new Date().toISOString(), operations }]);
}

/**
 * Marks the given transaction with a version label, like a git tag. The mark
 * itself is an operation recorded as a new transaction; it targets the
 * project model, as versions concern the project as a whole.
 */
export async function markHistoryVersion(backendUrl: string, projectIri: string, projectModelId: string, transactionClientId: string, version: string): Promise<void> {
  const operations: OperationInModel[] = [{ modelId: projectModelId, operation: createVersionOperation(transactionClientId, version) }];
  await applyHistoryTransactions(backendUrl, projectIri, [{ id: generateOperationId(), time: new Date().toISOString(), operations }]);
}

