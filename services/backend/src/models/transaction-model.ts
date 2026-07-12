import type { Entity } from "@dataspecer/core/entity-model";
import type { Transaction } from "@dataspecer/core/operation";
import { PrismaClient } from "@prisma/client";

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
  createdAt: Date;
  operations: CollectedOperation[];
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
 * Manages Transactions, Branches and Operations.
 */
export class TransactionModel {
  private readonly prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  /**
   * Creates the given transactions (in order) for the project identified by
   * its resource IRI, chaining each one to the previous transaction in the
   * array.
   *
   * The branch to append to can be given either as a name (a named branch,
   * chained onto the branch's current tip, or the project's latest
   * transaction if the branch does not exist yet - defaults to "main") or as
   * the internal numerical id of an existing branch (used for independent,
   * unnamed evolution branches, see {@link getOrCreateEvolutionBranch}),
   * which is always chained onto its own current tip only.
   *
   * After all transactions are created, the branch pointer is automatically
   * advanced to the last new transaction.
   */
  async createTransactions(projectIri: string, transactions: TransactionWithEvents[], branch: string | number = "main"): Promise<void> {
    const project = await this.prismaClient.resource.findFirst({ select: { id: true }, where: { iri: projectIri } });
    if (project === null) {
      throw new Error("Project resource not found.");
    }

    const branchRecord =
      typeof branch === "number"
        ? await this.prismaClient.branch.findFirst({ select: { id: true, transactionId: true }, where: { id: branch, projectId: project.id } })
        : await this.prismaClient.branch.findUnique({ select: { id: true, transactionId: true }, where: { projectId_name: { projectId: project.id, name: branch } } });

    if (typeof branch === "number" && branchRecord === null) {
      throw new Error("Branch not found.");
    }

    let parentId: number | null;
    if (branchRecord !== null) {
      parentId = branchRecord.transactionId;
    } else {
      parentId =
        (
          await this.prismaClient.transaction.findFirst({
            select: { id: true },
            where: { projectId: project.id },
            orderBy: { id: "desc" },
          })
        )?.id ?? null;
    }

    for (const transaction of transactions) {
      const created = await this.prismaClient.transaction.create({
        data: {
          projectId: project.id,
          upEvents: transaction.upEvents === undefined ? undefined : JSON.stringify(transaction.upEvents),
          downEvents: transaction.downEvents === undefined ? undefined : JSON.stringify(transaction.downEvents),
          parents: parentId === null ? undefined : { create: [{ parentTransactionId: parentId }] },
          operations: {
            create: transaction.operations.map((operation, order) => ({
              projectId: project.id,
              order,
              modelId: operation.modelId,
              data: JSON.stringify(operation.operation),
            })),
          },
        },
      });
      parentId = created.id;
    }

    if (parentId !== null) {
      if (branchRecord !== null) {
        await this.prismaClient.branch.update({ where: { id: branchRecord.id }, data: { transactionId: parentId } });
      } else {
        await this.prismaClient.branch.create({ data: { name: branch as string, projectId: project.id, transactionId: parentId } });
      }
    }
  }

  /**
   * Ensures an independent, unnamed branch exists for tracking pending
   * evolution updates to the given resource.
   *
   * A resource can only have one pending evolution branch at a time - if
   * one already exists it is deleted first, along with all of its
   * transactions and their operations, since such branches are never
   * shared history with any other branch.
   *
   * Returns the internal numerical id of the (newly created) branch.
   */
  async getOrCreateEvolutionBranch(projectIri: string, resourceIri: string): Promise<number> {
    const [project, resource] = await Promise.all([
      this.prismaClient.resource.findFirst({ select: { id: true }, where: { iri: projectIri } }),
      this.prismaClient.resource.findFirst({ select: { id: true }, where: { iri: resourceIri } }),
    ]);
    if (project === null) {
      throw new Error("Project resource not found.");
    }
    if (resource === null) {
      throw new Error("Resource not found.");
    }

    const existing = await this.prismaClient.branch.findUnique({
      select: { id: true },
      where: { projectId_resourceId: { projectId: project.id, resourceId: resource.id } },
    });

    if (existing !== null) {
      await this.deleteBranch(existing.id);
    }

    const created = await this.prismaClient.branch.create({
      data: { projectId: project.id, resourceId: resource.id },
    });

    return created.id;
  }

  /**
   * Deletes a branch along with its entire transaction history and their
   * operations. Only safe for branches whose transaction history is not
   * shared with any other branch, i.e. independent evolution branches.
   */
  private async deleteBranch(branchId: number): Promise<void> {
    const branch = await this.prismaClient.branch.findUnique({ select: { transactionId: true }, where: { id: branchId } });

    const transactionIds: number[] = [];
    let currentId = branch?.transactionId ?? null;
    while (currentId !== null) {
      const transaction = await this.prismaClient.transaction.findUnique({
        select: { id: true, parents: { select: { parentTransactionId: true } } },
        where: { id: currentId },
      });
      if (transaction === null) break;
      transactionIds.push(transaction.id);
      currentId = transaction.parents[0]?.parentTransactionId ?? null;
    }

    await this.prismaClient.branch.delete({ where: { id: branchId } });
    if (transactionIds.length > 0) {
      await this.prismaClient.transaction.deleteMany({ where: { id: { in: transactionIds } } });
    }
  }

  /**
   * Lists all branches of the given project, with their internal id,
   * optional name (for named branches) and optional tracked resource IRI
   * (for evolution branches).
   *
   * Returns null if the project does not exist.
   */
  async listBranches(projectIri: string): Promise<BranchInfo[] | null> {
    const project = await this.prismaClient.resource.findFirst({ select: { id: true }, where: { iri: projectIri } });
    if (project === null) {
      return null;
    }

    const branches = await this.prismaClient.branch.findMany({
      select: { id: true, name: true, resource: { select: { iri: true } } },
      where: { projectId: project.id },
    });

    return branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      resourceIri: branch.resource?.iri ?? null,
    }));
  }

  /**
   * Resolves a branch reference to its current tip transaction id, scoped
   * to the given project. The reference is either a branch name, or the
   * branch's internal numerical id wrapped in brackets, e.g. "[34]".
   */
  private async resolveBranchTip(projectId: number, ref: string): Promise<number | null> {
    const idMatch = ref.match(/^\[(\d+)\]$/);
    const branch =
      idMatch !== null
        ? await this.prismaClient.branch.findFirst({ select: { transactionId: true }, where: { id: Number(idMatch[1]), projectId } })
        : await this.prismaClient.branch.findUnique({ select: { transactionId: true }, where: { projectId_name: { projectId, name: ref } } });
    return branch?.transactionId ?? null;
  }

  /**
   * Returns transactions (and their operations) that are reachable from the
   * "to" branch tip but not from the "from" branch tip, ordered oldest to
   * newest. Branches are referenced by name or by internal id wrapped in
   * brackets, analogous to git's two-dot range syntax, e.g. "main..[34]".
   *
   * Returns null if the project does not exist.
   */
  async getTransactionsLog(projectIri: string, fromRef: string, toRef: string): Promise<CollectedTransaction[] | null> {
    const project = await this.prismaClient.resource.findFirst({ select: { id: true }, where: { iri: projectIri } });
    if (project === null) {
      return null;
    }

    const [fromTipId, toTipId] = await Promise.all([this.resolveBranchTip(project.id, fromRef), this.resolveBranchTip(project.id, toRef)]);

    // Return empty when there is no target branch or both branches point to
    // the same transaction (no difference).
    if (toTipId === null || toTipId === fromTipId) {
      return [];
    }

    interface CollectedTx {
      id: number;
      createdAt: Date;
      operations: { id: number; modelId: string; order: number; data: string }[];
      parents: { parentTransactionId: number }[];
    }

    // Walk backwards from the "to" tip, collecting transactions until we reach
    // the "from" tip (exclusive) or run out of history. When "from" does not
    // exist (null) it is treated as the initial commit, so the entire "to"
    // branch history is returned.
    const collected: CollectedTx[] = [];

    let currentId: number | null = toTipId;
    while (currentId !== null && currentId !== fromTipId) {
      const row = (await this.prismaClient.transaction.findUnique({
        where: { id: currentId },
        include: {
          operations: { orderBy: { order: "asc" } },
          parents: { select: { parentTransactionId: true } },
        },
      })) as CollectedTx | null;
      if (row === null) break;
      collected.push(row);
      currentId = row.parents[0]?.parentTransactionId ?? null;
    }

    collected.reverse(); // oldest first

    return collected.map((tx) => ({
      id: tx.id,
      createdAt: tx.createdAt,
      operations: tx.operations.map((op) => ({
        id: op.id,
        modelId: op.modelId,
        order: op.order,
        data: JSON.parse(op.data),
      })),
    }));
  }
}
