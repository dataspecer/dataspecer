import type { Entity } from "@dataspecer/core/entity-model";
import type { Operation, OperationInModel, Transaction } from "@dataspecer/core/operation";
import { Prisma, PrismaClient } from "@prisma/client";

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

/** Both the Prisma client and its interactive-transaction client. */
type Db = PrismaClient | Prisma.TransactionClient;

function findBranch(db: Db, projectId: number, branch: BranchReference): Promise<{ id: number; transactionId: number } | null> {
  return typeof branch === "number"
    ? db.branch.findFirst({ select: { id: true, transactionId: true }, where: { id: branch, projectId } })
    : db.branch.findUnique({ select: { id: true, transactionId: true }, where: { projectId_name: { projectId, name: branch } } });
}

/**
 * Manages Transactions, Branches and Operations: the history of a project
 * that its current state can be recomputed from.
 */
export class TransactionModel {
  private readonly prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private async getProjectId(projectIri: string): Promise<number | null> {
    const project = await this.prismaClient.resource.findUnique({ select: { id: true }, where: { iri: projectIri } });
    return project?.id ?? null;
  }

  /**
   * Walks the parent links from the given transaction backwards, up to (and
   * excluding) the stop transaction or the beginning of the history, and
   * returns the visited transaction ids ordered oldest first.
   */
  private async collectChainIds(db: Db, tipId: number | null, stopAtId: number | null = null): Promise<number[]> {
    const ids: number[] = [];
    let currentId = tipId;
    while (currentId !== null && currentId !== stopAtId) {
      const row = await db.transaction.findUnique({
        select: { id: true, parents: { select: { parentTransactionId: true } } },
        where: { id: currentId },
      });
      if (row === null) break;
      ids.push(row.id);
      currentId = row.parents[0]?.parentTransactionId ?? null;
    }
    return ids.reverse();
  }

  /**
   * Loads the transactions of a chain (see {@link collectChainIds}) together
   * with their operations, ordered oldest first.
   */
  private async loadTransactionChain(tipId: number | null, stopAtId: number | null = null) {
    const ids = await this.collectChainIds(this.prismaClient, tipId, stopAtId);
    const rows = await this.prismaClient.transaction.findMany({
      where: { id: { in: ids } },
      include: { operations: { orderBy: { order: "asc" } } },
    });
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
  private async getUnbranchedTipId(db: Db, projectId: number): Promise<number | null> {
    const branches = await db.branch.findMany({ select: { transactionId: true }, where: { projectId } });
    const owned = new Set<number>();
    for (const branch of branches) {
      for (const id of await this.collectChainIds(db, branch.transactionId)) {
        owned.add(id);
      }
    }
    const latest = await db.transaction.findFirst({
      select: { id: true },
      where: { projectId, id: { notIn: [...owned] } },
      orderBy: { id: "desc" },
    });
    return latest?.id ?? null;
  }

  /**
   * Creates the given transactions in order, chaining each one onto the
   * previous one and the first one onto the given parent. Returns the id of
   * the last created transaction, or the parent itself when there is nothing
   * to create.
   */
  private async createTransactionChain(db: Db, projectId: number, transactions: TransactionWithEvents[], parentId: number | null): Promise<number | null> {
    let tipId = parentId;
    for (const transaction of transactions) {
      const created = await db.transaction.create({
        data: {
          projectId,
          clientId: transaction.id,
          createdAt: transaction.time === undefined ? undefined : new Date(transaction.time),
          upEvents: transaction.upEvents === undefined ? undefined : JSON.stringify(transaction.upEvents),
          downEvents: transaction.downEvents === undefined ? undefined : JSON.stringify(transaction.downEvents),
          parents: tipId === null ? undefined : { create: [{ parentTransactionId: tipId }] },
          operations: {
            create: transaction.operations.map((operation, order) => ({
              projectId,
              order,
              modelId: operation.modelId,
              data: JSON.stringify(operation.operation),
            })),
          },
        },
      });
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

    await this.prismaClient.$transaction(
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
          await tx.branch.update({ where: { id: branchRecord.id }, data: { transactionId: tipId } });
        } else {
          await tx.branch.create({ data: { name: branch as string, projectId, transactionId: tipId } });
        }
      },
      // Recording an evolution of a large imported package can take a while.
      { timeout: 60_000 },
    );
  }

  /**
   * IRIs of the projects that recorded a transaction with the given client id.
   * A transaction targeting models of several projects is recorded once per
   * project, so operations referencing it (undo, version) belong to all of
   * them.
   */
  async getProjectsOfTransaction(clientId: string): Promise<string[]> {
    const rows = await this.prismaClient.transaction.findMany({
      select: { project: { select: { iri: true } } },
      where: { clientId },
      distinct: ["projectId"],
    });
    return rows.map((row) => row.project.iri);
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

    const branchRecord = await findBranch(this.prismaClient, projectId, branch);
    if (branchRecord === null && typeof branch === "number") {
      throw new Error("Branch not found.");
    }

    const tipId = branchRecord !== null ? branchRecord.transactionId : await this.getUnbranchedTipId(this.prismaClient, projectId);

    const rows = await this.loadTransactionChain(tipId);
    return rows.map((row) => ({
      clientId: row.clientId,
      createdAt: row.createdAt,
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

    const [projectId, resource] = await Promise.all([this.getProjectId(projectIri), this.prismaClient.resource.findUnique({ select: { id: true }, where: { iri: resourceIri } })]);
    if (projectId === null) {
      throw new Error("Project resource not found.");
    }
    if (resource === null) {
      throw new Error("Resource not found.");
    }

    return await this.prismaClient.$transaction(
      async (tx) => {
        const existing = await tx.branch.findUnique({
          select: { id: true, transactionId: true },
          where: { projectId_resourceId: { projectId, resourceId: resource.id } },
        });
        if (existing !== null) {
          await this.deleteBranch(tx, existing);
        }

        // Non-null, as there is at least one transaction to create.
        const tipId = (await this.createTransactionChain(tx, projectId, transactions, null))!;

        const created = await tx.branch.create({
          data: { projectId, resourceId: resource.id, transactionId: tipId },
        });
        return created.id;
      },
      // Recording an evolution of a large imported package can take a while.
      { timeout: 60_000 },
    );
  }

  /**
   * Deletes a branch along with its entire transaction history and their
   * operations. Only safe for branches whose transaction history is not
   * shared with any other branch, i.e. independent evolution branches.
   */
  private async deleteBranch(db: Db, branch: { id: number; transactionId: number }): Promise<void> {
    const transactionIds = await this.collectChainIds(db, branch.transactionId);
    await db.branch.delete({ where: { id: branch.id } });
    await db.transaction.deleteMany({ where: { id: { in: transactionIds } } });
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

    const branch = await this.prismaClient.branch.findFirst({
      select: { id: true, name: true, transactionId: true },
      where: { id: branchId, projectId },
    });
    if (branch === null) {
      return "not-found";
    }
    if (branch.name !== null) {
      return "not-evolution-branch";
    }

    await this.prismaClient.$transaction((tx) => this.deleteBranch(tx, branch));
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

    const branches = await this.prismaClient.branch.findMany({
      select: { id: true, name: true, resource: { select: { iri: true } } },
      where: { projectId },
    });

    return branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      resourceIri: branch.resource?.iri ?? null,
    }));
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
      from === null ? null : findBranch(this.prismaClient, projectId, from),
      findBranch(this.prismaClient, projectId, to),
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
      createdAt: row.createdAt,
      operations: row.operations.map((operation) => ({
        id: operation.id,
        modelId: operation.modelId,
        order: operation.order,
        data: JSON.parse(operation.data),
      })),
    }));
  }
}
