import type { OperationIdentifier, Transaction } from "./operation.ts";
import { isUndoOperation } from "./undo-operation.ts";

/**
 * Resolves which transactions are effectively cancelled by the undo operations.
 * Transactions must be ordered from oldest to newest. You can provide a
 * sub-interval, but it must be only in a form of "younger than" meaning the
 * newest transactions must be present.
 */
export function resolveCancelledTransactions(transactions: readonly Transaction[]): Set<OperationIdentifier> {
  const cancelled = new Set<OperationIdentifier>();
  for (let i = transactions.length - 1; i >= 0; i--) {
    const transaction = transactions[i];
    if (cancelled.has(transaction.id)) {
      continue;
    }
    for (const { operation } of transaction.operations) {
      if (isUndoOperation(operation)) {
        cancelled.add(operation.cancelTransactionId);
      }
    }
  }
  return cancelled;
}

/**
 * Filters an ordered history (oldest first) by removing cancelled transactions.
 * Removes all undo operations as they are not needed.
 */
export function filterCancelledTransactions<T extends Transaction>(transactions: readonly T[]): T[] {
  const cancelled = resolveCancelledTransactions(transactions);

  const result: T[] = [];
  for (const transaction of transactions) {
    if (cancelled.has(transaction.id)) {
      continue;
    }
    const operations = transaction.operations.filter(({ operation }) => !isUndoOperation(operation));
    if (operations.length > 0) {
      result.push({ ...transaction, operations });
    }
  }
  return result;
}
