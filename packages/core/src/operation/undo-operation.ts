import { generateOperationId, type Operation, type OperationIdentifier } from "./operation.ts";

/**
 * @see {@link UndoOperation}
 */
export const UNDO_OPERATION_TYPE = "undo" as const;

/**
 * An undo operation "cancels" a specific transaction (a set of operations) in
 * model it targets. The history then behaves as if the cancelled transaction's
 * operations never happened: the state is the state before the cancelled
 * transaction with all later non-cancelled operations replayed on top of it.
 *
 * The operation can be used to implement undo/redo functionality by canceling
 * the last non-canceled transaction and canceling undo operations to perform
 * redo (canceling an undo un-cancels the transaction the undo cancelled).
 *
 * If the referenced transaction cannot be resolved, the operation is ignored,
 * as required by the {@link Operation} contract.
 */
export interface UndoOperation extends Operation {
  type: typeof UNDO_OPERATION_TYPE;

  /**
   * Transaction ID that this undo cancels.
   */
  cancelTransactionId: OperationIdentifier;
}

export function createUndoOperation(cancelTransactionId: OperationIdentifier): UndoOperation {
  return {
    id: generateOperationId(),
    type: UNDO_OPERATION_TYPE,
    cancelTransactionId,
  };
}

export function isUndoOperation(operation: Operation): operation is UndoOperation {
  return operation.type === UNDO_OPERATION_TYPE;
}
