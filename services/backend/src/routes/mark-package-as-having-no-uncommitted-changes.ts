import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { resourceModel } from "../main.ts";


export const markPackageAsHavingNoUncommittedChanges = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });
  const { iri } = querySchema.parse(request.query);
  resourceModel.setHasUncommittedChanges(iri, false);
  response.sendStatus(200);
  return;
});
