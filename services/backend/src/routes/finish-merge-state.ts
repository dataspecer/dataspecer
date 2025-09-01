import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel } from "../main.ts";
import express from "express";


// TODO RadStr: Better name - and also I am using finish here on backend and finalize on client
/**
 * This handles the action, which should be performed, when merge state has all conflicts resolved.
 * That is when we pulled, update the git link of ds package.
 */
export const finishMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    uuid: z.string().min(1),
  });
  const query = querySchema.parse(request.query);
  const { uuid }= query;

  mergeStateModel.mergeStateFinisher(uuid);
  response.sendStatus(200);
  return;
});
