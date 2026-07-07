import { transactionModel } from "../main.ts";
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
            id: z.string(),
            operations: z.array(z.object({
                modelId: z.string().min(1),
                operation: z.any(),
            })),
        })),
    });
    const body = bodySchema.parse(request.body);

    await transactionModel.createTransactions(query.projectIri, body.transactions);

    response.sendStatus(204);
    return;
});

/**
 * Lists all branches of a project, with their internal id, optional name
 * (for named branches, e.g. "main") and optional tracked resource IRI (for
 * unnamed evolution branches, see {@link TransactionModel.getOrCreateEvolutionBranch}).
 *
 * Example: GET /transactions/branches?projectIri=...
 */
export const listBranches = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        projectIri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const branches = await transactionModel.listBranches(query.projectIri);
    if (branches === null) {
        response.status(404).json({ error: "Project not found" });
        return;
    }

    response.json({ branches });
});

/**
 * Diff endpoint: returns transactions (and their operations) that are reachable
 * from the "from" branch tip but not from the "to" branch tip, ordered oldest
 * to newest.  The range is specified as "fromBranch..toBranch", analogous to
 * git's two-dot range syntax. Either side can instead reference a branch by
 * its internal numerical id, wrapped in brackets, e.g. "main..[34]".
 *
 * Example: GET /transactions/log?projectIri=...&range=upstream..main
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
    const fromRef = range.slice(0, dotDot);
    const toRef = range.slice(dotDot + 2);

    const transactions = await transactionModel.getTransactionsLog(query.projectIri, fromRef, toRef);
    if (transactions === null) {
        response.status(404).json({ error: "Project not found" });
        return;
    }

    response.json({ transactions });
});
