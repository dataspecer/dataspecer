import { z } from "zod";
import { asyncHandler } from "../../../utils/async-handler.ts";
import { mergeStateModel } from "../../../main.ts";
import express from "express";

/**
 * This handles the action, which should be performed, when merge state has all conflicts resolved.
 * This handler handles the finalizing of merge state caused by pushing. Note that this is basically 2 phase.
 * 1st phase is the same as for pull - we just the DS last commit hash to to commit, which we want to use as parent.
 * So we basically do finalizer for pull merge state. Once we finish this, it already counts as a finished merge state.
 * So after we are done, then if we succeeded, we just create commit dialog with the stored message and user either enters it or not.
 * If not then the message is lost forever.
 */
export const finalizePushMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    uuid: z.string().min(1),
  });
  const query = querySchema.parse(request.query);
  const { uuid }= query;

  try {
    const result = await mergeStateModel.mergeStateFinalizer(uuid);
    if (result === null) {
      response.status(409);
      response.json({error: "The merge state still has conflicts"});
      return;
    }
    else {
      response.status(200);
      response.json({ uuid, mergeStateCause: result.mergeStateCause });
      return;
    }
  }
  catch(err) {
    response
      .status(300)
      .json({
        message: "The commit on which we are in DS is already after the commit to which we were pushing within the merge state",
      });
    return;
  }
});

