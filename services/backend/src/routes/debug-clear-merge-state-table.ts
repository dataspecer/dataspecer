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
