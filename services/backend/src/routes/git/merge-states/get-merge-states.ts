import { z } from "zod";
import { asyncHandler } from "../../../utils/async-handler.ts";
import { mergeStateModel } from "../../../main.ts";
import express from "express";
import { stringToBoolean } from "@dataspecer/git";


/**
 * Handles clients request to get all the merge states for the given iri. Notice that it is iri and not the paths.
 * Therefore, it should be used to only get merge states, where the merge actor with the iri is stored in Dataspecer.
 */
export const getMergeStates = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    includeDiffData: z.string().min(1),
  });
  const { iri, includeDiffData } = querySchema.parse(request.query);
  const mergeStates = await mergeStateModel.getMergeStates(iri, stringToBoolean(includeDiffData));
  response.json(mergeStates);
  return;
});
