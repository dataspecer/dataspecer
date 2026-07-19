import { modelRepository, transactionModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { z } from "zod";

const transactionsBodySchema = z.object({
  transactions: z.array(
    z.object({
      id: z.string(),
      time: z.string().datetime({ offset: true }).optional(),
      operations: z.array(
        z.object({
          modelId: z.string().min(1),
          operation: z.any(),
        }),
      ),
    }),
  ),
});

/**
 * The new interface for writing models: stores the transactions (in order)
 * for a given project and applies their operations to the stored models,
 * updating the JSON snapshots. See {@link ModelRepository.applyTransactions}.
 */
export const applyTransactions = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    projectIri: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const body = transactionsBodySchema.parse(request.body);

  await modelRepository.applyTransactions(query.projectIri, body.transactions);

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
 * Deletes an evolution branch, discarding its pending transactions -
 * effectively rolling the evolution back. Named branches cannot be deleted.
 *
 * Example: DELETE /transactions/branches/34?projectIri=...
 */
export const deleteEvolutionBranch = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    projectIri: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const branchId = Number(request.params.branchId);
  if (!Number.isInteger(branchId)) {
    response.status(400).json({ error: "branchId must be a number" });
    return;
  }

  const result = await transactionModel.deleteEvolutionBranch(query.projectIri, branchId);
  if (result === "not-found") {
    response.status(404).json({ error: "Branch not found" });
    return;
  }
  if (result === "not-evolution-branch") {
    response.status(400).json({ error: "Only evolution branches can be deleted" });
    return;
  }

  response.sendStatus(204);
});

/**
 * Parses one side of a range: either a branch name, or the internal numerical
 * id of a branch wrapped in brackets, e.g. "[34]".
 */
function parseBranchReference(reference: string): string | number {
  const idMatch = reference.match(/^\[(\d+)\]$/);
  return idMatch !== null ? Number(idMatch[1]) : reference;
}

/**
 * Diff endpoint: returns transactions (and their operations) that are reachable
 * from the "to" branch tip but not from the "from" branch tip, ordered oldest
 * to newest.  The range is specified as "fromBranch..toBranch", analogous to
 * git's two-dot range syntax. Either side can instead reference a branch by
 * its internal numerical id, wrapped in brackets, e.g. "main..[34]". A range
 * without ".." (just a branch reference) returns the entire history of that
 * branch.
 *
 * Example: GET /transactions/log/upstream..main?projectIri=...
 * Example: GET /transactions/log/main?projectIri=... (entire history of main)
 */
export const getTransactionsDiff = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    projectIri: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const range = String(request.params.range ?? "");
  const dotDot = range.indexOf("..");
  const fromRef = dotDot === -1 ? null : parseBranchReference(range.slice(0, dotDot));
  const toRef = parseBranchReference(range.slice(dotDot === -1 ? 0 : dotDot + 2));

  const transactions = await transactionModel.getTransactionsLog(query.projectIri, fromRef, toRef);
  if (transactions === null) {
    response.status(404).json({ error: "Project not found" });
    return;
  }

  response.json({ transactions });
});
