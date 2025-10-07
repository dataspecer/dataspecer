import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { AvailableFilesystems, FilesystemNodeLocation } from "@dataspecer/git";
import { FilesystemFactory } from "../export-import/filesystem-abstractions/backend-filesystem-abstraction-factory.ts";


/**
 * @deprecated ... not exactly deprecated, but we are no longer using it. But it should work
 */
export const getDataspecerTree = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const rootLocation: FilesystemNodeLocation = {
    iri: query.iri,
    fullPath: "",
    irisTreePath: "",
    projectIrisTreePath: "",
  };
  const dsFilesystem = await FilesystemFactory.createFileSystem([rootLocation], AvailableFilesystems.DS_Filesystem, null);
  // TODO RadStr: ... Actually sending the root is enough probably
  const globalFilesystemMapping = dsFilesystem.getGlobalFilesystemMapForProjectIris();
  response.json(globalFilesystemMapping);
});
