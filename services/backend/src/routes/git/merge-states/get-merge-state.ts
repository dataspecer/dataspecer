import { z } from "zod";
import { asyncHandler } from "../../../utils/async-handler.ts";
import { mergeStateModel } from "../../../main.ts";
import express from "express";
import { stringToBoolean } from "@dataspecer/git";


/**
 * Note that we need root paths. Iris are not enough identification (we can for example have 40 pull merge states)
 */
export const getMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    rootPathMergeFrom: z.string().min(1),
    rootPathMergeTo: z.string().min(1),
    includeDiffData: z.string().min(1),
    shouldForceDiffTreeReload: z.string().min(1)
  });
  const query = querySchema.parse(request.query);

  const { rootPathMergeFrom, rootPathMergeTo, includeDiffData, shouldForceDiffTreeReload } = query;

  const mergeState = await mergeStateModel.getMergeState(rootPathMergeFrom, rootPathMergeTo, stringToBoolean(includeDiffData), stringToBoolean(shouldForceDiffTreeReload));

  if (mergeState === null) {
    response.status(404).send({ error: `Merge state for ${rootPathMergeFrom} and ${rootPathMergeTo} does not exist.` });
    return;
  }

  response.json(mergeState);
  return;
});
