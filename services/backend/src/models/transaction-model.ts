import type { Entity } from "@dataspecer/core/entity-model";
import type { Operation, OperationInModel, Transaction } from "@dataspecer/core/operation";
import { parseDatabaseTimestamp, type Database } from "../database/schema.ts";

/**
 * Low-level log of entity changes made by a transaction: for each model, the
 * changed entities keyed by their id. In up events the value is the entity
 * AFTER the transaction (null = removed), in down events BEFORE the
 * transaction (null = did not exist yet).
 */
export type TransactionEvents = Record<string, Record<string, Entity | null>>;

/**
 * Transaction together with its optional up/down entity events. When the
 * events are missing, they were not recorded for the transaction.
 */
export interface TransactionWithEvents extends Transaction {
  upEvents?: TransactionEvents;
  downEvents?: TransactionEvents;
}

export interface CollectedOperation {
  id: number;
  modelId: string;
  order: number;
  data: unknown;
}

export interface CollectedTransaction {
  id: number;
  /** Client-generated transaction id, referenced by undo and version operations. */
  clientId: string;
  createdAt: Date;
  operations: CollectedOperation[];
}

/**
 * One transaction of a branch history as needed for interpreting undo
 * operations: its client id, operations (in order) and down events.
 */
export interface HistoryTransaction {
  /** Client-generated transaction id. */
  clientId: string;
  /** Time the transaction was executed. */
  createdAt: Date;
  operations: OperationInModel[];
  downEvents: TransactionEvents | null;
}

export interface BranchInfo {
  /** Internal numerical id of the branch. */
  id: number;
  /** Name of the branch, if it is a named branch. */
  name: string | null;
  /** IRI of the resource this branch tracks pending evolution updates for, if it is an evolution branch. */
  resourceIri: string | null;
}

/**
 * A branch is referenced either by its name (a named branch, e.g. "main") or
 * by the internal numerical id of an existing branch (used for independent,
 * unnamed evolution branches, see
 * {@link TransactionModel.createEvolutionBranch}).
 */
export type BranchReference = string | number;

async function findBranch(db: Database, projectId: number, branch: BranchReference): Promise<{ id: number; transactionId: number } | null> {
  return await db.selectFrom("Branch").select(["id", "transactionId"])
    .where("projectId", "=", projectId)
    .where(typeof branch === "number" ? "id" : "name", "=", branch)
    .executeTakeFirst() ?? null;
}

/**
 * Manages Transactions, Branches and Operations: the history of a project
 * that its current state can be recomputed from.
 */
export class TransactionModel {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  private async getProjectId(projectIri: string): Promise<number | null> {
    const project = await this.database.selectFrom("Resource").select("id").where("iri", "=", projectIri).executeTakeFirst();
    return project?.id ?? null;
  }

  /**
   * Walks the parent links from the given transaction backwards, up to (and
   * excluding) the stop transaction or the beginning of the history, and
   * returns the visited transaction ids ordered oldest first.
   */
  private async collectChainIds(db: Database, tipId: number | null, stopAtId: number | null = null): Promise<number[]> {
    const ids: number[] = [];
    let currentId = tipId;
    while (currentId !== null && currentId !== stopAtId) {
      const row: { id: number; parentTransactionId: number | null } | undefined = await db.selectFrom("Transaction")
        .leftJoin("TransactionParent", "TransactionParent.transactionId", "Transaction.id")
        .select(["Transaction.id", "TransactionParent.parentTransactionId"])
        .where("Transaction.id", "=", currentId)
        .orderBy("TransactionParent.parentTransactionId", "asc").executeTakeFirst();
      if (row === undefined) break;
      ids.push(row.id);
      currentId = row.parentTransactionId;
    }
    return ids.reverse();
  }

  /**
   * Loads the transactions of a chain (see {@link collectChainIds}) together
   * with their operations, ordered oldest first.
   */
  private async loadTransactionChain(tipId: number | null, stopAtId: number | null = null) {
    const ids = await this.collectChainIds(this.database, tipId, stopAtId);
    const rows = [];
    // Bound the number of parameters for long histories.
    for (let offset = 0; offset < ids.length; offset += 500) {
      const batch = ids.slice(offset, offset + 500);
      const transactions = await this.database.selectFrom("Transaction").selectAll()
        .where("id", "in", batch).execute();
      const operations = await this.database.selectFrom("Operation").selectAll()
        .where("transactionId", "in", batch).orderBy("order", "asc").execute();
      const operationsByTransaction = new Map<number, typeof operations>();
      for (const operation of operations) {
        const group = operationsByTransaction.get(operation.transactionId);
        if (group === undefined) {
          operationsByTransaction.set(operation.transactionId, [operation]);
        } else {
          group.push(operation);
        }
      }
      for (const transaction of transactions) {
        rows.push({ ...transaction, operations: operationsByTransaction.get(transaction.id) ?? [] });
      }
    }
    const rowsById = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => rowsById.get(id)!);
  }

  /**
   * The tip a not-yet-existing named branch starts from: the latest
   * transaction of the project that is not reachable from any existing
   * branch, i.e. the legacy history recorded before branches existed.
   * Transactions owned by a branch - in particular pending evolution
   * updates - must never be adopted by a new named branch.
   */
  private async getUnbranchedTipId(db: Database, projectId: number): Promise<number | null> {
    const branches = await db.selectFrom("Branch").select("transactionId").where("projectId", "=", projectId).execute();
    const owned = new Set<number>();
    for (const branch of branches) {
      for (const id of await this.collectChainIds(db, branch.transactionId)) {
        owned.add(id);
      }
    }
    const transactions = await db.selectFrom("Transaction").select("id")
      .where("projectId", "=", projectId).orderBy("id", "desc").execute();
    const latest = transactions.find(transaction => !owned.has(transaction.id));
    return latest?.id ?? null;
  }

  /**
   * Creates the given transactions in order, chaining each one onto the
   * previous one and the first one onto the given parent. Returns the id of
   * the last created transaction, or the parent itself when there is nothing
   * to create.
   */
  private async createTransactionChain(db: Database, projectId: number, transactions: TransactionWithEvents[], parentId: number | null): Promise<number | null> {
    let tipId = parentId;
    for (const transaction of transactions) {
      const created = await db.insertInto("Transaction").values({
        projectId,
        clientId: transaction.id,
        createdAt: transaction.time === undefined ? Date.now() : new Date(transaction.time).getTime(),
        upEvents: transaction.upEvents === undefined ? null : JSON.stringify(transaction.upEvents),
        downEvents: transaction.downEvents === undefined ? null : JSON.stringify(transaction.downEvents),
      }).returning("id").executeTakeFirstOrThrow();
      if (tipId !== null) {
        await db.insertInto("TransactionParent").values({ transactionId: created.id, parentTransactionId: tipId }).execute();
      }
      for (const [order, operation] of transaction.operations.entries()) {
        await db.insertInto("Operation").values({
          projectId,
          transactionId: created.id,
          order,
          modelId: operation.modelId,
          data: JSON.stringify(operation.operation),
        }).execute();
      }
      tipId = created.id;
    }
    return tipId;
  }

  /**
   * Creates the given transactions (in order) for the project identified by
   * its resource IRI, chaining each one to the previous transaction in the
   * array. Everything is written atomically in one database transaction.
   *
   * The branch to append to defaults to "main". A named branch that does not
   * exist yet is created, chained onto the latest transaction not owned by
   * any branch (the legacy history recorded before branches existed); a
   * branch referenced by id must exist and is always chained onto its own
   * current tip only.
   *
   * After all transactions are created, the branch pointer is advanced to the
   * last new transaction.
   */
  async createTransactions(projectIri: string, transactions: TransactionWithEvents[], branch: BranchReference = "main"): Promise<void> {
    const projectId = await this.getProjectId(projectIri);
    if (projectId === null) {
      throw new Error("Project resource not found.");
    }

    await this.database.transaction().execute(
      async (tx) => {
        const branchRecord = await findBranch(tx, projectId, branch);
        if (branchRecord === null && typeof branch === "number") {
          throw new Error("Branch not found.");
        }

        const parentId = branchRecord !== null ? branchRecord.transactionId : await this.getUnbranchedTipId(tx, projectId);
        const tipId = await this.createTransactionChain(tx, projectId, transactions, parentId);

        // Nothing was created and there is no history at all yet, so there is
        // no transaction a branch could point to.
        if (tipId === null) {
          return;
        }

        if (branchRecord !== null) {
          await tx.updateTable("Branch").set({ transactionId: tipId }).where("id", "=", branchRecord.id)
            .returning("id").executeTakeFirstOrThrow();
        } else {
          await tx.insertInto("Branch").values({ name: branch as string, projectId, transactionId: tipId, resourceId: null }).execute();
        }
      },
    );
  }

  /**
   * IRIs of the projects that recorded a transaction with the given client id.
   * A transaction targeting models of several projects is recorded once per
   * project, so operations referencing it (undo, version) belong to all of
   * them.
   */
  async getProjectsOfTransaction(clientId: string): Promise<string[]> {
    const rows = await this.database.selectFrom("Transaction")
      .innerJoin("Resource", "Resource.id", "Transaction.projectId")
      .select("Resource.iri").distinct().where("Transaction.clientId", "=", clientId).execute();
    return rows.map((row) => row.iri);
  }

  /**
   * Returns the transaction history of a branch of the project, oldest first,
   * with parsed operations and down events. Used for interpreting undo
   * operations, see the ModelRepository.
   *
   * The branch is referenced the same way as in {@link createTransactions}:
   * when a named branch does not exist yet, the history ends at the
   * transaction new transactions would be chained onto, see
   * {@link getUnbranchedTipId}.
   */
  async getBranchHistory(projectIri: string, branch: BranchReference = "main"): Promise<HistoryTransaction[]> {
    const projectId = await this.getProjectId(projectIri);
    if (projectId === null) {
      return [];
    }

    const branchRecord = await findBranch(this.database, projectId, branch);
    if (branchRecord === null && typeof branch === "number") {
      throw new Error("Branch not found.");
    }

    const tipId = branchRecord !== null ? branchRecord.transactionId : await this.getUnbranchedTipId(this.database, projectId);

    const rows = await this.loadTransactionChain(tipId);
    return rows.map((row) => ({
      clientId: row.clientId,
      createdAt: parseDatabaseTimestamp(row.createdAt),
      operations: row.operations.map((operation) => ({ modelId: operation.modelId, operation: JSON.parse(operation.data) as Operation })),
      downEvents: row.downEvents === null ? null : (JSON.parse(row.downEvents) as TransactionEvents),
    }));
  }

  /**
   * Records the given transactions on an independent, unnamed branch tracking
   * pending evolution updates to the given resource. The history of such a
   * branch starts from scratch, it is never shared with another branch.
   *
   * A resource can only have one pending evolution branch at a time - if one
   * already exists it is deleted first, along with all of its transactions
   * and their operations.
   *
   * At least one transaction is required, as a branch always points to one.
   * Returns the internal numerical id of the created branch.
   */
  async createEvolutionBranch(projectIri: string, resourceIri: string, transactions: TransactionWithEvents[]): Promise<number> {
    if (transactions.length === 0) {
      throw new Error("Cannot create a branch without any transaction.");
    }

    const [projectId, resource] = await Promise.all([this.getProjectId(projectIri), this.database.selectFrom("Resource").select("id").where("iri", "=", resourceIri).executeTakeFirst()]);
    if (projectId === null) {
      throw new Error("Project resource not found.");
    }
    if (resource === undefined) {
      throw new Error("Resource not found.");
    }

    return await this.database.transaction().execute(
      async (tx) => {
        const existing = await tx.selectFrom("Branch").select(["id", "transactionId"])
          .where("projectId", "=", projectId).where("resourceId", "=", resource.id).executeTakeFirst();
        if (existing !== undefined) {
          await this.deleteBranch(tx, existing);
        }

        // Non-null, as there is at least one transaction to create.
        const tipId = (await this.createTransactionChain(tx, projectId, transactions, null))!;

        const created = await tx.insertInto("Branch")
          .values({ projectId, resourceId: resource.id, transactionId: tipId, name: null })
          .returning("id").executeTakeFirstOrThrow();
        return created.id;
      },
    );
  }

  /**
   * Deletes a branch along with its entire transaction history and their
   * operations. Only safe for branches whose transaction history is not
   * shared with any other branch, i.e. independent evolution branches.
   */
  private async deleteBranch(db: Database, branch: { id: number; transactionId: number }): Promise<void> {
    const transactionIds = await this.collectChainIds(db, branch.transactionId);
    await db.deleteFrom("Branch").where("id", "=", branch.id).returning("id").executeTakeFirstOrThrow();
    for (const id of transactionIds) {
      await db.deleteFrom("Transaction").where("id", "=", id).execute();
    }
  }

  /**
   * Deletes an evolution branch of the given project, discarding its pending
   * transactions - effectively rolling the evolution back. Named branches
   * (e.g. "main") cannot be deleted this way as their history is shared.
   */
  async deleteEvolutionBranch(projectIri: string, branchId: number): Promise<"deleted" | "not-found" | "not-evolution-branch"> {
    const projectId = await this.getProjectId(projectIri);
    if (projectId === null) {
      return "not-found";
    }

    const branch = await this.database.selectFrom("Branch").select(["id", "name", "transactionId"])
      .where("id", "=", branchId).where("projectId", "=", projectId).executeTakeFirst();
    if (branch === undefined) {
      return "not-found";
    }
    if (branch.name !== null) {
      return "not-evolution-branch";
    }

    await this.database.transaction().execute((tx) => this.deleteBranch(tx, branch));
    return "deleted";
  }

  /**
   * Lists all branches of the given project, with their internal id,
   * optional name (for named branches) and optional tracked resource IRI
   * (for evolution branches).
   *
   * Returns null if the project does not exist.
   */
  async listBranches(projectIri: string): Promise<BranchInfo[] | null> {
    const projectId = await this.getProjectId(projectIri);
    if (projectId === null) {
      return null;
    }

    return await this.database.selectFrom("Branch")
      .leftJoin("Resource", "Resource.id", "Branch.resourceId")
      .select(["Branch.id", "Branch.name", "Resource.iri as resourceIri"])
      .where("Branch.projectId", "=", projectId).execute();
  }

  /**
   * Returns transactions (and their operations) that are reachable from the
   * "to" branch tip but not from the "from" branch tip, ordered oldest to
   * newest - analogous to git's two-dot range syntax "from..to". A branch
   * reference that does not resolve to an existing branch, or a null "from",
   * is treated as the initial (empty) commit - null "from" therefore returns
   * the entire history of the "to" branch.
   *
   * Returns null if the project does not exist.
   */
  async getTransactionsLog(projectIri: string, from: BranchReference | null, to: BranchReference): Promise<CollectedTransaction[] | null> {
    const projectId = await this.getProjectId(projectIri);
    if (projectId === null) {
      return null;
    }

    const [fromBranch, toBranch] = await Promise.all([
      from === null ? null : findBranch(this.database, projectId, from),
      findBranch(this.database, projectId, to),
    ]);
    const fromTipId = fromBranch?.transactionId ?? null;
    const toTipId = toBranch?.transactionId ?? null;

    // No target branch, or both branches point to the same transaction.
    if (toTipId === null || toTipId === fromTipId) {
      return [];
    }

    // Walk backwards from the "to" tip until the "from" tip (exclusive) or the
    // beginning of the history when "from" does not exist.
    const rows = await this.loadTransactionChain(toTipId, fromTipId);
    return rows.map((row) => ({
      id: row.id,
      clientId: row.clientId,
      createdAt: parseDatabaseTimestamp(row.createdAt),
      operations: row.operations.map((operation) => ({
        id: operation.id,
        modelId: operation.modelId,
        order: operation.order,
        data: JSON.parse(operation.data),
      })),
    }));
  }
}
