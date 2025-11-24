import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel } from "../main.ts";
import express from "express";


export const finalizeMergeMergeStateOnFailure = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    mergeStateUuid: z.string().min(1),
    finalizerVariant: z.enum(["remove-merge-state"]),
  });

  const query = querySchema.parse(request.query);
  const { mergeStateUuid, finalizerVariant } = query;

  if (finalizerVariant === "remove-merge-state") {
    await mergeStateModel.removeMergeStateByUuid(mergeStateUuid);
  }
  else {
    throw new Error(`Programmer error using ${finalizerVariant} for push, which does not have handling on backend`);
  }

  response.sendStatus(200);
  return;
});
