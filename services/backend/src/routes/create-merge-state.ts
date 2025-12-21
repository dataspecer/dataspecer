import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { mergeStateModel, resourceModel } from "../main.ts";
import express from "express";
import { AvailableFilesystems, ComparisonData, createConflictsFromDiffTrees, GitProvider, MergeState, MergeStateCause } from "@dataspecer/git";
import { compareBackendFilesystems } from "../export-import/filesystem-abstractions/backend-filesystem-comparison.ts";
import { createSimpleGit, getCommonCommitInHistory, gitCloneBasic } from "@dataspecer/git-node/simple-git-methods";
import { SimpleGit } from "simple-git";
import { MergeEndInfoWithRootNode } from "../models/merge-state-model.ts";
import { removePathRecursively, MERGE_CONFLICTS_PRIVATE } from "@dataspecer/git-node";


export const createMergeStateBetweenDSPackagesHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    mergeFromIri: z.string().min(1),
    mergeToIri: z.string().min(1),
  });

  const { mergeFromIri, mergeToIri } = querySchema.parse(request.query);

  const mergeFromResource = await resourceModel.getResource(mergeFromIri);
  const mergeToResource = await resourceModel.getResource(mergeToIri);

  if (mergeFromResource === null || mergeToResource === null) {
    response.status(404).send({error: `The Merge from or Merge to does not exists in the Dataspecer. The map of iri to boolean if it exists (from and to) ${mergeFromIri}: ${mergeFromResource !== null}, ${mergeToIri}: ${mergeFromResource !== null}`});
    return;
  }

  const { git, gitInitialDirectory, gitDirectoryToRemoveAfterWork } = createSimpleGit(mergeFromIri, MERGE_CONFLICTS_PRIVATE, false);
  try {
    await gitCloneBasic(git, gitInitialDirectory, mergeFromResource.linkedGitRepositoryURL, false, true, undefined);

    const { createdMergeStateId, hasConflicts } = await createMergeStateBetweenDSPackages(
      git, "",
      mergeFromIri, mergeFromResource.lastCommitHash, mergeFromResource.branch,
      mergeToIri, mergeToResource.lastCommitHash, mergeToResource.branch, mergeFromResource.linkedGitRepositoryURL);

    if (!hasConflicts) {
      response.status(200);
      response.json({ noConflicts: true, mergeStateId: createdMergeStateId });
      return;
    }

    const mergeState = await mergeStateModel.getMergeStateFromUUID(createdMergeStateId, false, true, false);

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
  commitMessage: string,
  mergeFromRootIri: string,
  mergeFromLastCommitHash: string,
  mergeFromBranch: string,
  mergeToRootIri: string,
  mergeToLastCommitHash: string,
  mergeToBranch: string,
  remoteRepositoryUrl: string,
): Promise<{ createdMergeStateId: string, hasConflicts: boolean }> {
  const mergeFromForComparison: MergeEndpointForComparison = {
    rootIri: mergeFromRootIri,
    filesystemType: AvailableFilesystems.DS_Filesystem,
    fullPathToRootParent: "",
    gitProvider: null,
  };
  const mergeToForComparison: MergeEndpointForComparison = {
    rootIri: mergeToRootIri,
    filesystemType: AvailableFilesystems.DS_Filesystem,
    fullPathToRootParent: "",
    gitProvider: null,
  };

  const {
    diffTreeComparisonResult,
    rootMergeFrom, pathToRootMetaMergeFrom,
    filesystemMergeTo, fakeRootMergeTo, rootMergeTo, pathToRootMetaMergeTo,
  } = await compareBackendFilesystems(mergeFromForComparison, mergeToForComparison);
    const commonCommitHash = await getCommonCommitInHistory(git, mergeFromLastCommitHash, mergeToLastCommitHash);

    const mergeFromInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeFrom,
      filesystemType: AvailableFilesystems.DS_Filesystem,
      lastCommitHash: mergeFromLastCommitHash,
      branch: mergeFromBranch,
      rootFullPathToMeta: pathToRootMetaMergeFrom,
      gitUrl: remoteRepositoryUrl,
    };

    const mergeToInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeTo,
      filesystemType: AvailableFilesystems.DS_Filesystem,
      lastCommitHash: mergeToLastCommitHash,
      branch: mergeToBranch,
      rootFullPathToMeta: pathToRootMetaMergeTo,
      gitUrl: remoteRepositoryUrl,
    };

    const createdMergeStateId = await mergeStateModel.createMergeStateIfNecessary(
      mergeFromRootIri, commitMessage, "merge", diffTreeComparisonResult,
      commonCommitHash, mergeFromInfo, mergeToInfo);
    return {
      createdMergeStateId,
      hasConflicts: diffTreeComparisonResult.conflicts.length > 0,
    };
}

type MergeEndpointBase = {
  rootIri: string,
  filesystemType: AvailableFilesystems,
  fullPathToRootParent: string,
}

export type MergeEndpointForComparison = {
  gitProvider: GitProvider | null,
} & MergeEndpointBase

export type MergeEndpointForStateUpdate = {
  git: SimpleGit | null,
  lastCommitHash: string,
  branch: string,
} & MergeEndpointForComparison

export async function updateMergeStateToBeUpToDate(
  uuid: string,
  commitMessage: string,
  mergeFrom: MergeEndpointForStateUpdate,
  mergeTo: MergeEndpointForStateUpdate,
  mergeStateCause: MergeStateCause,
  previousMergeState: MergeState | null
): Promise<boolean> {
  const {
    diffTreeComparisonResult,
    rootMergeFrom, pathToRootMetaMergeFrom,
    filesystemMergeTo, fakeRootMergeTo, rootMergeTo, pathToRootMetaMergeTo,
  } = await compareBackendFilesystems(mergeFrom, mergeTo);

    let newConflicts: ComparisonData[] = [];
    if (previousMergeState !== null) {
      await createConflictsFromDiffTrees(
        previousMergeState.diffTreeData?.diffTree ?? null, previousMergeState.unresolvedConflicts ?? [],
        diffTreeComparisonResult.diffTree, diffTreeComparisonResult.conflicts,
        newConflicts
      );
    }
    else {
      newConflicts = diffTreeComparisonResult.conflicts;
    }
    diffTreeComparisonResult.conflicts = newConflicts;


    let commonCommitHash: string | undefined = undefined;
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

    // Can put in nulls for gitUrls since we are not using that value for update
    const mergeFromInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeFrom,
      filesystemType: mergeFrom.filesystemType,
      lastCommitHash: mergeFrom.lastCommitHash,
      branch: mergeFrom.branch,
      rootFullPathToMeta: pathToRootMetaMergeFrom,
      gitUrl: null,
    };

    const mergeToInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeTo,
      filesystemType: mergeTo.filesystemType,
      lastCommitHash: mergeTo.lastCommitHash,
      branch: mergeTo.branch,
      rootFullPathToMeta: pathToRootMetaMergeTo,
      gitUrl: null
    };

    const isSuccessfullyUpdated = await mergeStateModel.updateMergeStateToBeUpToDate(
      uuid, commitMessage, mergeStateCause, diffTreeComparisonResult,
      commonCommitHash, mergeFromInfo, mergeToInfo);
    return isSuccessfullyUpdated;
}