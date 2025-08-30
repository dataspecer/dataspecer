import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel } from "../main.ts";
import express from "express";


export const updateMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const bodySchema = z.object({
    uuid: z.string(),
    changedInEditable: z.string(),
    removedInEditable: z.string(),
    createdInEditable: z.string(),
    unresolvedConflicts: z.string(),
    diffTree: z.string(),
  });
  const body = bodySchema.parse(request.body);

  await mergeStateModel.updateMergeStateWithStrings(body.uuid, body.diffTree, body.changedInEditable, body.removedInEditable, body.createdInEditable, body.unresolvedConflicts);

  response.sendStatus(200);
  return;
});
