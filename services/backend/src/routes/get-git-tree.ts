import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { AvailableFilesystems, FilesystemNodeLocation } from "@dataspecer/git";
import { FilesystemFactory } from "../export-import/filesystem-abstractions/backend-filesystem-abstraction-factory.ts";

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
  const dsFilesystem = FilesystemFactory.createFileSystem([rootLocation], AvailableFilesystems.ClassicFilesystem, null);
  // TODO RadStr: Decide if we want to use global mapping or getRoot (of course if we want to use the direct access at all)
  response.json((await dsFilesystem).getRoot());
});

function findPathToGitRepository(packageIri: string): string {
  throw new Error("TODO RadStr: Not implemented yet");
}
