import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel } from "../main.ts";
import express from "express";
import { stringToBoolean } from "../utils/git-utils.ts";


export const getMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    rootIriMergeFrom: z.string().min(1),
    rootIriMergeTo: z.string().min(1),
    includeDiffData: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const { rootIriMergeFrom, rootIriMergeTo, includeDiffData } = query;

  const mergeState = await mergeStateModel.getMergeState(rootIriMergeFrom, rootIriMergeTo, stringToBoolean(includeDiffData));

  if (mergeState === null) {
    response.status(404).send({ error: `Merge state for ${rootIriMergeFrom} and ${rootIriMergeTo} does not exist.` });
    return;
  }

  response.json(mergeState);
  return;
});
