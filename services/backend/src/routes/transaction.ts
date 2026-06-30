import { prismaClient, transactionModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { z } from "zod";

/**
 * Side-channel endpoint that stores transactions (in order) for a given
 * project. Each transaction is a set of operations applied atomically,
 * possibly to several models. The backend chains the given transactions
 * together, and to the project's previously stored transaction, if any.
 *
 * This does not affect the actual model data, which is stored separately as
 * full snapshots, see resource blob routes.
 */
export const createTransactions = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        projectIri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const bodySchema = z.object({
        transactions: z.array(z.object({
            operations: z.array(z.object({
                modelId: z.string().min(1),
                operation: z.unknown(),
            })),
        })),
    });
    const body = bodySchema.parse(request.body);

    await transactionModel.createTransactions(query.projectIri, body.transactions);

    response.sendStatus(204);
    return;
});

/**
 * Diff endpoint: returns transactions (and their operations) that are reachable
 * from the "from" branch tip but not from the "to" branch tip, ordered oldest
 * to newest.  The range is specified as "fromBranch..toBranch", analogous to
 * git's two-dot range syntax.
 *
 * Example: GET /transactions/diff?projectIri=...&range=upstream..main
 */
export const getTransactionsDiff = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        projectIri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const range = String(request.params.range ?? "");
    const dotDot = range.indexOf("..");
    if (dotDot === -1) {
        response.status(400).json({ error: "range must be 'fromBranch..toBranch'" });
        return;
    }
    const fromBranchName = range.slice(0, dotDot);
    const toBranchName = range.slice(dotDot + 2);

    const project = await prismaClient.resource.findFirst({
        select: { id: true },
        where: { iri: query.projectIri },
    });
    if (!project) {
        response.status(404).json({ error: "Project not found" });
        return;
    }

    const [fromBranch, toBranch] = await Promise.all([
        prismaClient.branch.findUnique({
            select: { transactionId: true },
            where: { projectId_name: { projectId: project.id, name: fromBranchName } },
        }),
        prismaClient.branch.findUnique({
            select: { transactionId: true },
            where: { projectId_name: { projectId: project.id, name: toBranchName } },
        }),
    ]);

    const fromTipId = fromBranch?.transactionId ?? null;
    const toTipId = toBranch?.transactionId ?? null;

    // Return empty when there is no target branch or both branches point to
    // the same transaction (no difference).
    if (!toTipId || toTipId === fromTipId) {
        response.json({ transactions: [] });
        return;
    }

    interface CollectedTx {
        id: number;
        createdAt: Date;
        operations: { id: number; modelId: string; order: number; data: string }[];
        parents: { parentTransactionId: number }[];
    }

    // Walk backwards from the "to" tip, collecting transactions until we reach
    // the "from" tip (exclusive) or run out of history.  When "from" does not
    // exist (null) it is treated as the initial commit, so the entire "to"
    // branch history is returned.
    const collected: CollectedTx[] = [];

    let currentId: number | null = toTipId;
    while (currentId !== null && currentId !== fromTipId) {
        const row = await prismaClient.transaction.findUnique({
            where: { id: currentId },
            include: {
                operations: { orderBy: { order: "asc" } },
                parents: { select: { parentTransactionId: true } },
            },
        }) as CollectedTx | null;
        if (!row) break;
        collected.push(row);
        currentId = row.parents[0]?.parentTransactionId ?? null;
    }

    collected.reverse(); // oldest first

    response.json({
        transactions: collected.map((tx) => ({
            id: tx.id,
            createdAt: tx.createdAt,
            operations: tx.operations.map((op) => ({
                id: op.id,
                modelId: op.modelId,
                order: op.order,
                data: JSON.parse(op.data),
            })),
        })),
    });
});
