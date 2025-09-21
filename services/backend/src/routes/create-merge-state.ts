import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel, resourceModel } from "../main.ts";
import express from "express";
import { FilesystemFactory } from "../export-import/filesystem-abstractions/backend-filesystem-abstraction-factory.ts";
import { AvailableFilesystems, compareFileTrees, EditableType, FilesystemNodeLocation, getMergeFromMergeToForGitAndDS, getMetadataDatastoreFile, MergeStateCause } from "@dataspecer/git";
import { compareBackendFilesystems } from "../export-import/filesystem-abstractions/backend-filesystem-comparison.ts";
import { createSimpleGit, getCommonCommitInHistory, gitCloneBasic } from "../utils/simple-git-utils.ts";
import { SimpleGit } from "simple-git";


export const createMergeState = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    mergeFromIri: z.string().min(1),
    mergeToIri: z.string().min(1),
  });

  console.info("TODO RadStr: createMergeState");    // TODO RadStr DEBUG: Debug print

  const { mergeFromIri, mergeToIri } = querySchema.parse(request.query);

  const mergeFromResource = await resourceModel.getResource(mergeFromIri);
  const mergeToResource = await resourceModel.getResource(mergeToIri);

  if (mergeFromResource === null || mergeToResource === null) {
    response.status(404).send({error: `The Merge from or Merge to does not exists in the Dataspecer. The map of iri to boolean if it exists (from and to) ${mergeFromIri}: ${mergeFromResource !== null}, ${mergeToIri}: ${mergeFromResource !== null}`});
    return;
  }
  const { git, gitInitialDirectory } = createSimpleGit(mergeFromIri, "merge-conflicts");
  await gitCloneBasic(git, gitInitialDirectory, mergeFromResource.linkedGitRepositoryURL, false, true, undefined);

  const uuid = await computeMergeStateForIris(git, mergeFromIri, mergeFromResource.lastCommitHash, mergeToIri, mergeToResource.lastCommitHash);

  if (uuid === null) {
    response.status(200);
    response.json(null);
    return;
  }

  const mergeState = await mergeStateModel.getMergeStateFromUUID(uuid, false);

  if (mergeState === null) {
    response.status(400).send({error: `Can not create new merge state for merge from iri ${mergeFromIri} and merge to iri ${mergeToIri}.
      It might have been server error, but most-likely you just provided bad iris.`});
    return;
  }


  response.status(200);
  response.json(mergeState);
  return;
});



export async function computeMergeStateForIris(
  git: SimpleGit,
  mergeFromRootIri: string,
  mergeFromLastCommitHash: string,
  mergeToRootIri: string,
  mergeToLastCommitHash: string,
): Promise<string | null> {
  const {
    diffTreeComparisonResult,
    rootMergeFrom, pathToRootMetaMergeFrom,
    filesystemMergeTo, fakeRootMergeTo, rootMergeTo, pathToRootMetaMergeTo,
  } = await compareBackendFilesystems(null, null,
    mergeFromRootIri, "", AvailableFilesystems.DS_Filesystem,
    mergeToRootIri, "", AvailableFilesystems.DS_Filesystem);

    const { valueMergeFrom: lastHashMergeFrom, valueMergeTo: lastHashMergeTo } = getMergeFromMergeToForGitAndDS("pull", mergeFromLastCommitHash, mergeToLastCommitHash);
    const commonCommitHash = await getCommonCommitInHistory(git, mergeFromLastCommitHash, mergeToLastCommitHash);

    const createdMergeStateId = mergeStateModel.createMergeStateIfNecessary(
      mergeFromRootIri, "merge", diffTreeComparisonResult,
      lastHashMergeFrom, lastHashMergeTo, commonCommitHash,
      rootMergeFrom, pathToRootMetaMergeFrom, AvailableFilesystems.DS_Filesystem,
      rootMergeTo, pathToRootMetaMergeTo, AvailableFilesystems.DS_Filesystem);
    return createdMergeStateId;
}