import { z } from "zod";
import { asyncHandler } from "../../../utils/async-handler.ts";
import { mergeStateModel } from "../../../main.ts";
import express from "express";


export const updateMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  // TODO RadStr: WIP API
  // const bodySchema = z.object({
  //   uuid: z.string(),
  //   changedInEditable: z.string(),
  //   removedInEditable: z.string(),
  //   createdInEditable: z.string(),
  //   unresolvedConflicts: z.string(),
  //   diffTree: z.string(),
  // });

  const bodySchema = z.object({
    uuid: z.string(),
    currentlyUnresolvedConflicts: z.array(z.string()),
  });
  const body = bodySchema.parse(request.body);

  await mergeStateModel.updateMergeStateConflictList(body.uuid, body.currentlyUnresolvedConflicts);

  response.sendStatus(200);
  return;
});
