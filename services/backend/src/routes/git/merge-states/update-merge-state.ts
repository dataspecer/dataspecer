import { z } from "zod";
import { asyncHandler } from "../../../utils/async-handler.ts";
import { mergeStateModel } from "../../../main.ts";
import express from "express";


export const updateMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const bodySchema = z.object({
    uuid: z.string(),
    conflictPathsToResolve: z.array(z.string()),
  });
  const body = bodySchema.parse(request.body);

  await mergeStateModel.updateMergeStateConflictList(body.uuid, body.conflictPathsToResolve);

  response.sendStatus(200);
  return;
});
