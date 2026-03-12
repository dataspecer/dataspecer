import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { AvailableFilesystems, createRootFilesystemNodeLocation, FilesystemNodeLocation } from "@dataspecer/git";
import { FilesystemFactoryMethodParams, FilesystemFactory } from "@dataspecer/git-node";
import { createFilesystemFactoryParams } from "../../utils/filesystem-helpers.ts";


/**
 * @deprecated We are currently not needing this. We just fetch the whole diff tree instead of just the filesystem trees (in this case specifically Dataspecer filesystem).
 */
export const getDataspecerTree = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const rootLocation: FilesystemNodeLocation = createRootFilesystemNodeLocation(query.iri, "");
  const factoryParams: FilesystemFactoryMethodParams = {
    roots: [rootLocation],
    gitIgnore: null,
    ...createFilesystemFactoryParams(true),
  };
  const dsFilesystem = await FilesystemFactory.createFileSystem(AvailableFilesystems.DS_Filesystem, factoryParams);
  // Either do this or maybe just sending the root is enough probably
  const globalFilesystemMapping = dsFilesystem.getGlobalFilesystemMapForProjectIris();
  response.json(globalFilesystemMapping);
});
