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
