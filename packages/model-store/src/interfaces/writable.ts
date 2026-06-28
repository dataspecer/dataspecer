import type { OperationInModel } from "@dataspecer/core/operation";

/**
 * Since some operations are performed in a batch on multiple models, this
 * interface provides a way to perform multiple operations in a single
 * transaction.
 *
 * This is synchronous interface, meaning that the result of the transaction is
 * immediate.
 *
 * All models that are managed by the model store are not writable because
 * writing is managed by the model store itself. But, in theory, we can have a
 * writeable model but this would mean that it would directly trigger a
 * transaction. Or we can have something like "start transaction", then apply
 * operations to individual stores and then "commit transaction" to the model
 * store. But this is future work as it is not needed right now.
 */
export interface WritableModelStore {
  /**
   * Dispatches a set of operations to multiple models in a single transaction.
   *
   * The order of operations in a single transaction is currently not important,
   * but may have some meaning in the future.
   *
   * If error occurs, the error is thrown.
   */
  transaction(operations: OperationInModel[], metadata: TransactionMetadata): TransactionResult;

  addOperationForTransaction(operations: OperationInModel[]): void;
  commitTransaction(metadata: TransactionMetadata): TransactionResult;
}

export interface TransactionMetadata {
  // Currently empty
}

export interface TransactionResult {
  transactionId: string;

  /**
   * This promise is resolved when the backend acknowledges the transaction,
   * sends back the final transaction order, and all subscribers were notified
   * about the changes.
   *
   * You can await this promise to ensure that the operation was applied as
   * expected by simply checking the local state of the model after the promise
   * is resolved.
   */
  confirmation: Promise<TransactionConfirmationStatus>;
}

export interface TransactionConfirmationStatus {
  // Currently empty
}
