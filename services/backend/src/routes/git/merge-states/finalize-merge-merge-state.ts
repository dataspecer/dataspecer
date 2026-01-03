import { z } from "zod";
import { asyncHandler } from "../../../utils/async-handler.ts";
import { mergeStateModel } from "../../../main.ts";
import express from "express";


/**
 * This handles the action, which should be performed, when merge state has all conflicts resolved.
 * This handler handles the finalizing of merge state caused by merging.
 */
export const finalizeMergeMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    mergeStateUuid: z.string().min(1),
    mergeCommitType: z.enum(["merge-commit", "rebase-commit"]),
  });

  const query = querySchema.parse(request.query);
  const { mergeStateUuid, mergeCommitType } = query;

  const result = await mergeStateModel.mergeStateFinalizer(mergeStateUuid, mergeCommitType);
  if (result === null) {
    response.status(409);
    response.json({error: "The merge state still has conflicts"});
    return;
  }
  else {
    response.status(200);
    response.json({ mergeStateUuid, mergeStateCause: result.mergeStateCause });
    return;
  }
});
