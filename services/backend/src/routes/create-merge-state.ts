import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel, resourceModel } from "../main.ts";
import express from "express";
import { AvailableFilesystems, getMergeFromMergeToForGitAndDS, GitProvider, MergeStateCause } from "@dataspecer/git";
import { compareBackendFilesystems } from "../export-import/filesystem-abstractions/backend-filesystem-comparison.ts";
import { createSimpleGit, getCommonCommitInHistory, gitCloneBasic } from "../utils/simple-git-utils.ts";
import { SimpleGit } from "simple-git";
import { MergeEndInfoWithRootNode } from "../models/merge-state-model.ts";
import { removePathRecursively } from "../utils/git-utils.ts";


export const createMergeStateBetweenDSPackagesHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
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

  const { git, gitInitialDirectory, gitDirectoryToRemoveAfterWork } = createSimpleGit(mergeFromIri, "merge-conflicts");
  try {
    await gitCloneBasic(git, gitInitialDirectory, mergeFromResource.linkedGitRepositoryURL, false, true, undefined);

    const { createdMergeStateId, hasConflicts } = await createMergeStateBetweenDSPackages(git, mergeFromIri, mergeFromResource.lastCommitHash, mergeToIri, mergeToResource.lastCommitHash);

    if (!hasConflicts) {
      response.status(200);
      response.json({ noConflicts: true, mergeStateId: createdMergeStateId });
      return;
    }

    const mergeState = await mergeStateModel.getMergeStateFromUUID(createdMergeStateId, false);

    if (mergeState === null) {
      response.status(400).send({error: `Can not create new merge state for merge from iri ${mergeFromIri} and merge to iri ${mergeToIri}.
        It might have been server error, but most-likely you just provided bad iris.`});
      return;
    }


    response.status(200);
    response.json(mergeState);
    return;
  }
  catch (error) {
    throw error;
  }
  finally {
    removePathRecursively(gitDirectoryToRemoveAfterWork);
  }
});



export async function createMergeStateBetweenDSPackages(
  git: SimpleGit,
  mergeFromRootIri: string,
  mergeFromLastCommitHash: string,
  mergeToRootIri: string,
  mergeToLastCommitHash: string,
): Promise<{ createdMergeStateId: string, hasConflicts: boolean }> {
  const mergeFromForComparison: MergeEndpointForComparison = {
    rootIri: mergeFromRootIri,
    filesystemType: AvailableFilesystems.DS_Filesystem,
    fullPath: "",
    gitProvider: null,
  };
  const mergeToForComparison: MergeEndpointForComparison = {
    rootIri: mergeToRootIri,
    filesystemType: AvailableFilesystems.DS_Filesystem,
    fullPath: "",
    gitProvider: null,
  };

  const {
    diffTreeComparisonResult,
    rootMergeFrom, pathToRootMetaMergeFrom,
    filesystemMergeTo, fakeRootMergeTo, rootMergeTo, pathToRootMetaMergeTo,
  } = await compareBackendFilesystems(mergeFromForComparison, mergeToForComparison);

    const { valueMergeFrom: lastHashMergeFrom, valueMergeTo: lastHashMergeTo } = getMergeFromMergeToForGitAndDS("pull", mergeFromLastCommitHash, mergeToLastCommitHash);
    const commonCommitHash = await getCommonCommitInHistory(git, mergeFromLastCommitHash, mergeToLastCommitHash);


    const mergeFromInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeFrom,
      filesystemType: AvailableFilesystems.DS_Filesystem,
      lastCommitHash: lastHashMergeFrom,
      rootFullPathToMeta: pathToRootMetaMergeFrom,
    };

    const mergeToInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeTo,
      filesystemType: AvailableFilesystems.DS_Filesystem,
      lastCommitHash: lastHashMergeTo,
      rootFullPathToMeta: pathToRootMetaMergeTo,
    };

    const createdMergeStateId = await mergeStateModel.createMergeStateIfNecessary(
      mergeFromRootIri, "merge", diffTreeComparisonResult,
      commonCommitHash, mergeFromInfo, mergeToInfo);
    return {
      createdMergeStateId,
      hasConflicts: diffTreeComparisonResult.conflicts.length > 0,
    };
}

type MergeEndpointBase = {
  rootIri: string,
  filesystemType: AvailableFilesystems,
  fullPath: string,
}

export type MergeEndpointForComparison = {
  gitProvider: GitProvider | null,
} & MergeEndpointBase

export type MergeEndpointForStateUpdate = {
  git: SimpleGit | null,
  lastCommitHash: string,
} & MergeEndpointForComparison

export async function updateMergeStateToBeUpToDate(
  uuid: string,
  mergeFrom: MergeEndpointForStateUpdate,
  mergeTo: MergeEndpointForStateUpdate,
  mergeStateCause: MergeStateCause,
): Promise<boolean> {
  const {
    diffTreeComparisonResult,
    rootMergeFrom, pathToRootMetaMergeFrom,
    filesystemMergeTo, fakeRootMergeTo, rootMergeTo, pathToRootMetaMergeTo,
  } = await compareBackendFilesystems(mergeFrom, mergeTo);

    let commonCommitHash: string | null = null;
    const gitsToTry = [];
    if (mergeFrom.git !== null) {
      gitsToTry.push(mergeFrom.git);
    }
    if (mergeTo.git !== null) {
      gitsToTry.push(mergeTo.git);
    }


    for (const [index, gitToTry] of gitsToTry.entries()) {
      const isLast = index === gitsToTry.length - 1;
      try {
        commonCommitHash = await getCommonCommitInHistory(gitToTry, mergeFrom.lastCommitHash, mergeTo.lastCommitHash);
        break;      // If we found common commit. Otherwise it may be the case that one git is newer than the other one so it may be in the other one
      }
      catch(error) {
        if (isLast) {
          throw error;
        }
      }
    }

    const mergeFromInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeFrom,
      filesystemType: mergeFrom.filesystemType,
      lastCommitHash: mergeFrom.lastCommitHash,
      rootFullPathToMeta: pathToRootMetaMergeFrom,
    };

    const mergeToInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeTo,
      filesystemType: mergeTo.filesystemType,
      lastCommitHash: mergeTo.lastCommitHash,
      rootFullPathToMeta: pathToRootMetaMergeTo,
    };

    const rootResourceIri: string = mergeFrom.rootIri;    // TODO RadStr: Not sure now about the iris, but we will see
    const isSuccessfullyUpdated = await mergeStateModel.updateMergeStateToBeUpToDate(
      uuid, mergeStateCause, diffTreeComparisonResult,
      commonCommitHash!, mergeFromInfo, mergeToInfo);
    return isSuccessfullyUpdated;
}