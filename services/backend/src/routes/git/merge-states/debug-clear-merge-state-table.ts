import { asyncHandler } from "../../../utils/async-handler.ts";
import { mergeStateModel } from "../../../main.ts";
import express from "express";


/**
 * TODO RadStr: Just for debugging
 */
export const clearMergeStateTableDebug = asyncHandler(async (request: express.Request, response: express.Response) => {
  await mergeStateModel.clearTable();
  response.sendStatus(200);
  return;
});
