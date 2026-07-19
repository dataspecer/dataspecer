import { generateOperationId, type Operation, type OperationIdentifier, type Transaction } from "./operation.ts";

/**
 * @see {@link VersionOperation}
 */
export const VERSION_OPERATION_TYPE = "version" as const;

/**
 * Marks a specific transaction with a version label, e.g. "1.1" - analogous to
 * a git tag. The transaction history up to (and including) the marked
 * transaction is then understood as belonging to that version, which is used
 * for example to publish the history in version-separated chunks (see the LDES
 * publishing).
 *
 * The operation does not change any entities of the model it is dispatched to;
 * it only becomes part of the history. Models that do not understand it simply
 * ignore it, as required by the {@link Operation} contract.
 */
export interface VersionOperation extends Operation {
  type: typeof VERSION_OPERATION_TYPE;

  /**
   * Transaction ID that this version marks.
   */
  versionedTransactionId: OperationIdentifier;

  /**
   * Human-readable version label, e.g. "1.1".
   */
  version: string;
}

export function createVersionOperation(versionedTransactionId: OperationIdentifier, version: string): VersionOperation {
  if (!(typeof version === "string" && version.length > 0)) {
    throw new Error("Invalid version label.");
  }

  return {
    id: generateOperationId(),
    type: VERSION_OPERATION_TYPE,
    versionedTransactionId,
    version,
  };
}

export function isVersionOperation(operation: Operation): operation is VersionOperation {
  return operation.type === VERSION_OPERATION_TYPE;
}

/**
 * A version found in a transaction history: the label, the transaction it
 * marks and the transaction that carries the marking operation (whose time is
 * the publication time of the version).
 */
export interface TransactionVersion {
  version: string;

  /**
   * ID of the transaction the version marks - the last transaction that
   * belongs to the version.
   */
  versionedTransactionId: OperationIdentifier;

  /**
   * ID of the transaction containing the {@link VersionOperation}.
   */
  markerTransactionId: OperationIdentifier;
}

/**
 * Collects the versions marked in an ordered history (oldest first), in the
 * order of their marking. Version operations referencing a transaction that is
 * not part of the history are ignored, as required by the {@link Operation}
 * contract.
 */
export function collectTransactionVersions(transactions: readonly Transaction[]): TransactionVersion[] {
  const knownTransactionIds = new Set(transactions.map((transaction) => transaction.id));

  const versions: TransactionVersion[] = [];
  for (const transaction of transactions) {
    for (const { operation } of transaction.operations) {
      if (isVersionOperation(operation) && knownTransactionIds.has(operation.versionedTransactionId)) {
        versions.push({
          version: operation.version,
          versionedTransactionId: operation.versionedTransactionId,
          markerTransactionId: transaction.id,
        });
      }
    }
  }
  return versions;
}
