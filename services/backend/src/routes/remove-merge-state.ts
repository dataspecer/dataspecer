import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel } from "../main.ts";
import express from "express";


/**
 * Removes the merge state and any related data (mostly git repos). We don't care that it is not resolved
 */
export const removeMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    uuid: z.string().min(1),
  });
  const query = querySchema.parse(request.query);
  const { uuid }= query;

  const mergeState = await mergeStateModel.getMergeStateFromUUID(uuid, false, false);
  if (mergeState === null) {
    response.status(404).json({error: `Merge state with uuid (${uuid}) does not exist`});
    return;
  }

  await mergeStateModel.removeMergeState(mergeState);
  response.status(200);
  response.json({ uuid });
  return;
});
