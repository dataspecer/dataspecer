import type { ColumnType, Generated, Kysely, Selectable } from "kysely";

/** Existing DATETIME columns contain either epoch milliseconds or UTC text. */
type Timestamp = ColumnType<number | string, number, number>;

export interface DatabaseSchema {
  /**
   * Represents a package or a model of any supported type.
   */
  Resource: {
    /**
     * Internal numerical ID for database purposes.
     */
    id: Generated<number>;

    /**
     * Parent resource, or null for a root resource. Every non-root model has a
     * parent. Child relationships are stored here temporarily rather than in
     * the model itself.
     */
    parentResourceId: number | null;

    /**
     * Public IRI of the resource.
     */
    iri: string;

    /**
     * Representation type used to determine how this storage handles the
     * resource, such as a package, mounted package, conceptual model, or EA
     * file. Other storage systems may use different types. This describes
     * representation, not interpretation.
     */
    representationType: string;

    /**
     * Links to the resource's raw data stores, each corresponding to an
     * individual file. Most models have a single file. The default store name
     * is "model".
     */
    dataStoreId: Generated<string>;

    /**
     * Shared user metadata, such as a name, description, or tags. Stored here
     * temporarily rather than in the model itself.
     */
    userMetadata: Generated<string>;

    /**
     * Resource creation time.
     */
    createdAt: Timestamp;

    /**
     * Resource modification time, updated when its IRI, type, data stores, or
     * user metadata change.
     */
    modifiedAt: Timestamp;

    /**
     * Last subtree modification time, reflecting the latest modification among
     * children.
     */
    subtreeModifiedAt: Timestamp;
  };

  /**
   * A sequence of operations bundled as a single unit of work.
   */
  Transaction: {
    /**
     * Internal numerical ID for database purposes.
     */
    id: Generated<number>;

    /**
     * Numerical ID of the project (root resource), for easier querying.
     */
    projectId: number;

    /**
     * Client-generated transaction ID, used by undo operations to identify
     * the transaction they cancel.
     */
    clientId: string;

    /**
     * Transaction creation time.
     */
    createdAt: Timestamp;

    /**
     * Entity changes after the transaction, serialized as JSON Record<ModelId,
     * Record<EntityId, Entity | null>>, where null means removal. Excludes blob
     * models and the virtual project model; see ModelRepository. Null when
     * events were not recorded.
     */
    upEvents: string | null

    /**
     * Entity states before the transaction, using the same structure as
     * upEvents. Null entity values indicate entities that did not exist yet.
     * Used to restore previous states. Includes blob models, unlike upEvents.
     */
    downEvents: string | null
  };

  /**
   * Links a transaction to its parent transactions.
   */
  TransactionParent: {
    transactionId: number;
    parentTransactionId: number;
  };

  /**
   * A single operation applied to one model as part of a transaction.
   */
  Operation: {
    id: Generated<number>;

    /**
     * Numerical ID of the project (root resource), for easier querying.
     */
    projectId: number;

    transactionId: number;

    /**
     * Order of the operation within its transaction.
     */
    order: number;

    /**
     * ID of the model to which the operation is applied.
     */
    modelId: string;

    /**
     * Operation serialized as JSON. The backend does not interpret it.
     */
    data: string;
  };

  /**
   * A named pointer to a transaction representing the tip of a branch's history.
   */
  Branch: {
    id: Generated<number>;
    name: string | null;
    projectId: number;

    /**
     * Transaction at the tip of the branch's history. Every branch has one; a
     * project without transactions has no branches.
     */
    transactionId: number;

    /**
     * Resource whose pending evolution updates this branch tracks. Set only for
     * unnamed, independent evolution branches created by reload.
     */
    resourceId: number | null;
  };
}

export type Database = Kysely<DatabaseSchema>;
export type ResourceRow = Selectable<DatabaseSchema["Resource"]>;

export function parseDatabaseTimestamp(value: number | string): Date {
  if (typeof value === "number") {
    return new Date(value);
  }
  // CURRENT_TIMESTAMP omits the timezone, but always represents UTC.
  return new Date(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)
    ? value.replace(" ", "T") + "Z"
    : value);
}
