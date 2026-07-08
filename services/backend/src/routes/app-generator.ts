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
    // If provided, the generated application is saved to a local directory in addition to returning it in the response
    const outputDirectory = process.env.APP_GENERATOR_OUTPUT_DIR;
    const result = await generateApp({
      graph: data,
      metadataProvider: new DataspecerSpecificationMetadataProvider(
        getSpecification,
      ),
      ...(outputDirectory ? { outputDirectory, allowOverwrite: false } : {}),
    });
    // TODO: Return the generated application as a downloadable archive and add endpoints for graph storage, validation,
    //  and metadata lookup for the graph editor.
    response.setHeader("Content-Type", "application/json");
    response.send(result);
  },
);
