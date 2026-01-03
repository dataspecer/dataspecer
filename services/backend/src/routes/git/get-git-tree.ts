import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { AvailableFilesystems, FilesystemNodeLocation } from "@dataspecer/git";
import { FilesystemFactory } from "../../export-import/filesystem-abstractions/backend-filesystem-abstraction-factory.ts";

/**
 * @deprecated Similarly to {@link getDataspecerTree} also not used.
 * @todo If it will be used, then both this method and the {@link getDataspecerTree} should decide if they will return the fake root,
 *  or the whole globalFilesystemMapping from the filesystem
 */
export const getGitTree = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });
  const query = querySchema.parse(request.query);


  const fullPathToGitRepository = findPathToGitRepository(query.iri);
  const rootLocation: FilesystemNodeLocation = {
    iri: query.iri,
    fullPath: fullPathToGitRepository,
    irisTreePath: "",
    projectIrisTreePath: "",
  };
  const gitFilesystem = FilesystemFactory.createFileSystem([rootLocation], AvailableFilesystems.ClassicFilesystem, null, null);
  // TODO: Decide if we want to use global mapping or getRoot (of course if we want to use the direct access at all)
  response.json((await gitFilesystem).getRoot());
});

function findPathToGitRepository(packageIri: string): string {
  throw new Error("Not implemented yet");
}
