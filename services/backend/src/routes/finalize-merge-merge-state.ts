import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel } from "../main.ts";
import express from "express";


/**
 * This handles the action, which should be performed, when merge state has all conflicts resolved.
 * This handler handles the finalizing of merge state caused by merging.
 */
export const finalizeMergeMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  throw new Error("TODO RadStr: Not yet properly implemented");

  // const querySchema = z.object({
  //   uuid: z.string().min(1),
  // });
  // const query = querySchema.parse(request.query);
  // const { uuid }= query;

  // const result = await mergeStateModel.mergeStateFinalizer(uuid);
  // if (result === null) {
  //   response.status(409);
  //   response.json({error: "The merge state still has conflicts"});
  //   return;
  // }
  // else {
  //   response.status(200);
  //   response.json({ uuid, mergeStateCause: result.mergeStateCause });
  //   return;
  // }
});
