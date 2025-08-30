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
  const strippedMapping = removeCircularDependenciesFromFilesystemAbstraction(globalFilesystemMapping)
  response.json(strippedMapping);
});


/**
 * @returns Created copy of {@link globalFilesystemMapping} with parent in each node removed and therefore removing circular dependencies.
 */
function removeCircularDependenciesFromFilesystemAbstraction(globalFilesystemMapping: Record<string, FilesystemNode>): Record<string, Omit<FilesystemNode, "parent>">> {
  const strippedMapping: Record<string, Omit<FilesystemNode, "parent>">> = {};

  for (const [key, {parent, ...rest}] of Object.entries(globalFilesystemMapping)) {
    strippedMapping[key] = rest as Omit<FilesystemNode, "parent>">;
  }

  return strippedMapping;
}
