import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel } from "../main.ts";
import express from "express";


export const finalizePullMergeStateOnFailure = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    mergeStateUuid: z.string().min(1),
    rootIriToUpdate: z.string().min(1),
    pulledCommitHash: z.string().min(1),
    finalizerVariant: z.enum(["remove-merge-state", "pull-anyways"]),
  });

  const query = querySchema.parse(request.query);
  const { mergeStateUuid, rootIriToUpdate, pulledCommitHash, finalizerVariant } = query;

  if (finalizerVariant === "pull-anyways") {
    await mergeStateModel.forceHandlePullFinalizer(rootIriToUpdate, pulledCommitHash);
  }
  else if (finalizerVariant === "remove-merge-state") {
    await mergeStateModel.removeMergeStateByUuid(mergeStateUuid);
  }

  response.status(200);
  return;
});
