import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel } from "../main.ts";
import express from "express";
import { stringToBoolean } from "../utils/git-utils.ts";


export const getMergeStates = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    includeDiffData: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const { iri, includeDiffData } = query;

  const mergeStates = await mergeStateModel.getMergeStates(iri, stringToBoolean(includeDiffData));

  response.json(mergeStates);
  return;
});
