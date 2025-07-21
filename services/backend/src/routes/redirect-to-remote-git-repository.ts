import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { resourceModel } from "../main.ts";
import express from "express";

export const redirectToRemoteGitRepository = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const resource = await resourceModel.getPackage(query.iri);

  if (!resource) {
    response.status(404).send({ error: "Package does not exist." });
    return;
  }

  const url = resource.linkedGitRepositoryURL;

  response.redirect(url);
});
