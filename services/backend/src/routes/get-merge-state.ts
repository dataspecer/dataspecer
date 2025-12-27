import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel } from "../main.ts";
import express from "express";
import { stringToBoolean } from "@dataspecer/git";


export const getMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    rootIriMergeFrom: z.string().min(1),
    rootIriMergeTo: z.string().min(1),
    includeDiffData: z.string().min(1),
    shouldForceDiffTreeReload: z.string().min(1)
  });
  const query = querySchema.parse(request.query);

  const { rootIriMergeFrom, rootIriMergeTo, includeDiffData, shouldForceDiffTreeReload } = query;

  const mergeState = await mergeStateModel.getMergeState(rootIriMergeFrom, rootIriMergeTo, stringToBoolean(includeDiffData), stringToBoolean(shouldForceDiffTreeReload));

  if (mergeState === null) {
    response.status(404).send({ error: `Merge state for ${rootIriMergeFrom} and ${rootIriMergeTo} does not exist.` });
    return;
  }

  response.json(mergeState);
  return;
});
