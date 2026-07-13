import type { OperationIdentifier, Transaction } from "./operation.ts";
import { isUndoOperation } from "./undo-operation.ts";

/**
 * Resolves which transactions of an ordered history (oldest first) are
 * effectively cancelled by the undo operations contained in it, and in which
 * models.
 *
 * An undo operation cancels the referenced transaction as a whole. However,
 * since every operation is applied to a single model in isolation, the undo
 * is dispatched to each model the cancelled transaction touched, and the
 * cancellation takes effect in exactly the models it was dispatched to -
 * which is why the result is tracked per model. Cancelling a transaction that
 * itself contains an undo operation revokes that cancellation, so the
 * originally cancelled transaction becomes effective again (redo).
 *
 * @returns For each cancelled transaction id, the set of model ids the
 * cancellation was dispatched to.
 */
export function resolveCancelledTransactions(transactions: readonly Transaction[]): Map<OperationIdentifier, Set<string>> {
  // For each model, for each transaction, the ids of later transactions that
  // contain an undo operation cancelling it in that model.
  const cancellers = new Map<string, Map<OperationIdentifier, OperationIdentifier[]>>();
  for (const transaction of transactions) {
    for (const { modelId, operation } of transaction.operations) {
      if (!isUndoOperation(operation)) {
        continue;
      }
      let byTarget = cancellers.get(modelId);
      if (!byTarget) {
        byTarget = new Map();
        cancellers.set(modelId, byTarget);
      }
      let byCanceller = byTarget.get(operation.cancelTransactionId);
      if (!byCanceller) {
        byCanceller = [];
        byTarget.set(operation.cancelTransactionId, byCanceller);
      }
      byCanceller.push(transaction.id);
    }
  }

  const result = new Map<OperationIdentifier, Set<string>>();

  for (const [modelId, byTarget] of cancellers) {
    // A transaction is cancelled in the model if at least one of its
    // cancellers is itself not cancelled in the model. Cancellers always come
    // later in the history, so the recursion terminates; the guard set
    // protects against malformed (cyclic) references.
    const memo = new Map<OperationIdentifier, boolean>();
    const isCancelled = (transactionId: OperationIdentifier, guard: Set<OperationIdentifier>): boolean => {
      const memoized = memo.get(transactionId);
      if (memoized !== undefined) {
        return memoized;
      }
      if (guard.has(transactionId)) {
        return false;
      }
      guard.add(transactionId);
      const cancelled = (byTarget.get(transactionId) ?? []).some((canceller) => !isCancelled(canceller, guard));
      guard.delete(transactionId);
      memo.set(transactionId, cancelled);
      return cancelled;
    };

    for (const transactionId of byTarget.keys()) {
      if (isCancelled(transactionId, new Set())) {
        let models = result.get(transactionId);
        if (!models) {
          models = new Set();
          result.set(transactionId, models);
        }
        models.add(modelId);
      }
    }
  }

  return result;
}

/**
 * Filters an ordered history (oldest first) down to its effective operations:
 * undo operations themselves are removed, and so are the operations of the
 * transactions they effectively cancel (in the models the cancellation was
 * dispatched to, see {@link resolveCancelledTransactions}). Transactions left
 * with no operations are dropped. Replaying the result yields the same state
 * as replaying the full history with the undo operations interpreted.
 */
export function filterCancelledTransactions<T extends Transaction>(transactions: readonly T[]): T[] {
  const cancelled = resolveCancelledTransactions(transactions);

  const result: T[] = [];
  for (const transaction of transactions) {
    const cancelledModels = cancelled.get(transaction.id);
    const operations = transaction.operations.filter(({ modelId, operation }) => !isUndoOperation(operation) && !cancelledModels?.has(modelId));
    if (operations.length > 0) {
      result.push({ ...transaction, operations });
    }
  }
  return result;
}
