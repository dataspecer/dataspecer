import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel, resourceModel } from "../main.ts";
import express from "express";
import { z } from "zod";


/**
 * TODO RadStr: Just for debugging
 */
export const clearMergeStateTableDebug = asyncHandler(async (request: express.Request, response: express.Response) => {
  await mergeStateModel.clearTable();
  response.sendStatus(200);
  return;
});


/**
 * TODO RadStr: Just for debugging
 */
export const clearMergeFromDataFromResourceDebug = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });

  const { iri } = querySchema.parse(request.query);
  await resourceModel.updateMergeData(iri, "", "", "");

  response.sendStatus(200);
  return;
});
