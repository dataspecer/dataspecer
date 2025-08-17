import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { AvailableFilesystems, FilesystemFactory } from "../export-import/filesystem-abstractions/filesystem-abstraction.ts";
import { DirectoryNode, FilesystemNode, FilesystemNodeLocation } from "../export-import/export-import-data-api.ts";


export const getDataspecerTree = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const rootLocation: FilesystemNodeLocation = {
    iri: query.iri,
    fullPath: "",
    fullTreePath: ""
  };
  const dsFilesystem = await FilesystemFactory.createFileSystem([rootLocation], AvailableFilesystems.DS_Filesystem, null);
  // TODO RadStr: ... Actually sending the root is enough probably
  const globalFilesystemMapping = dsFilesystem.getGlobalFilesystemMap();
  removeCircuclarDependenciesFromFilesystemAbstraction(globalFilesystemMapping)
  response.json(globalFilesystemMapping);
});


function removeCircuclarDependenciesFromFilesystemAbstraction(globalFilesystemMapping: Record<string, FilesystemNode>) {
  for (const node of Object.values(globalFilesystemMapping)) {
    node.parent = null;
  }

  return globalFilesystemMapping;
}
