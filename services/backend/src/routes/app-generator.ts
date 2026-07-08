import z from "zod";
import express from "express";
import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import {
  DataspecerSpecificationMetadataProvider,
  generateApp,
} from "@dataspecer/app-generator";
import { getSpecification } from "../utils/data-specification.ts";

export const generateApplicationByModelId = asyncHandler(
  async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
      iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const modelStore = await resourceModel.getOrCreateResourceModelStore(
      query.iri,
    );
    const data: any = await modelStore.getJson();
    const result = await generateApp({
      graph: data,
      metadataProvider: new DataspecerSpecificationMetadataProvider(
        getSpecification,
      ),
      outputDirectory:
        "/home/evaganov/Desktop/my/MFF/predmety/Výzkumný projekt/dataspecer-fork/packages/app-generator/tmp/test-app",
    });
    response.setHeader("Content-Type", "application/json");
    response.send(result);
  },
);
