import { generateLightweightOwl } from "@dataspecer/lightweight-owl";
import { simplifiedSemanticModelToSemanticModel } from "../models/simplified-semantic-model/adapter.ts";
import express from "express";
import { asyncHandler } from "../utils/async-handler.ts";

export const getLightweightOwlFromSimplified = asyncHandler(async (request: express.Request, response: express.Response) => {
  const entities = simplifiedSemanticModelToSemanticModel(request.body, {});
  const result = await generateLightweightOwl(Object.values(entities), { baseIri: "", iri: "" });
  response.type("text/turtle").send(result);
  return;
});
