import { z } from "zod";
import { asyncHandler } from "../../../utils/async-handler.ts";
import { mergeStateModel, resourceModel } from "../../../main.ts";
import express from "express";
import { AvailableFilesystems, DatastoreComparison, createConflictsFromDiffTrees, MergeState, MergeStateCause } from "@dataspecer/git";
import { compareBackendFilesystems } from "../../../export-import/filesystem-abstractions/backend-filesystem-comparison.ts";
import { getCommonCommitInHistory, gitCloneBasic } from "@dataspecer/git-node/simple-git-methods";
import { SimpleGit } from "simple-git";
import { MergeEndInfoWithRootNode, MergeEndpointForComparison, MergeEndpointForStateUpdate } from "../../../models/merge-state-model.ts";
import { createSimpleGitUsingPredefinedGitRoot, MERGE_CONFLICTS_PRIVATE, removePathRecursively } from "@dataspecer/git-node";
import { ResourceModelForFilesystemRepresentation } from "../../../export-import/export.ts";


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

  const { git, gitInitialDirectory, gitDirectoryToRemoveAfterWork } = createSimpleGitUsingPredefinedGitRoot(mergeFromIri, MERGE_CONFLICTS_PRIVATE, false);
  try {
    await gitCloneBasic(git, gitInitialDirectory, mergeFromResource.linkedGitRepositoryURL, false, true, undefined);
    const mergeFromData: CreateMergeStateBetweenDSPackagesType = {
      rootIri: mergeFromIri,
      isBranch: mergeFromResource.representsBranchHead,
      branch: mergeFromResource.branch,
      lastCommitHash: mergeFromResource.lastCommitHash,
      resourceModel: resourceModel,
    };
    const mergeToData: CreateMergeStateBetweenDSPackagesType = {
      rootIri: mergeToIri,
      isBranch: mergeToResource.representsBranchHead,
      branch: mergeToResource.branch,
      lastCommitHash: mergeToResource.lastCommitHash,
      resourceModel: resourceModel,
    };

    const { createdMergeStateId, hasConflicts } = await createMergeStateBetweenDSPackages(
      git, "", mergeFromData, mergeToData, mergeFromResource.linkedGitRepositoryURL);

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


type CreateMergeStateBetweenDSPackagesType = {
  rootIri: string;
  isBranch: boolean;
  branch: string;
  lastCommitHash: string;
  resourceModel: ResourceModelForFilesystemRepresentation;
};

export async function createMergeStateBetweenDSPackages(
  git: SimpleGit,
  commitMessage: string,
  mergeFrom: CreateMergeStateBetweenDSPackagesType,
  mergeTo: CreateMergeStateBetweenDSPackagesType,
  remoteRepositoryUrl: string,
): Promise<{ createdMergeStateId: string, hasConflicts: boolean }> {
  const mergeFromForComparison: MergeEndpointForComparison = {
    rootIri: mergeFrom.rootIri,
    filesystemType: AvailableFilesystems.DS_Filesystem,
    fullPathToRootParent: "",
    gitIgnore: null,
    resourceModel: mergeFrom.resourceModel,
  };
  const mergeToForComparison: MergeEndpointForComparison = {
    rootIri: mergeTo.rootIri,
    filesystemType: AvailableFilesystems.DS_Filesystem,
    fullPathToRootParent: "",
    gitIgnore: null,
    resourceModel: mergeTo.resourceModel,
  };

  const {
    diffTreeComparisonResult,
    rootMergeFrom, pathToRootMetaMergeFrom,
    filesystemMergeTo, fakeRootMergeTo, rootMergeTo, pathToRootMetaMergeTo,
  } = await compareBackendFilesystems(mergeFromForComparison, mergeToForComparison);
    const commonCommitHash = await getCommonCommitInHistory(git, mergeFrom.lastCommitHash, mergeTo.lastCommitHash);

    const mergeFromInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeFrom,
      filesystemType: AvailableFilesystems.DS_Filesystem,
      lastCommitHash: mergeFrom.lastCommitHash,
      isBranch: mergeFrom.isBranch,
      branch: mergeFrom.branch,
      rootFullPathToMeta: pathToRootMetaMergeFrom,
      gitUrl: remoteRepositoryUrl,
    };

    const mergeToInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeTo,
      filesystemType: AvailableFilesystems.DS_Filesystem,
      lastCommitHash: mergeTo.lastCommitHash,
      isBranch: mergeTo.isBranch,
      branch: mergeTo.branch,
      rootFullPathToMeta: pathToRootMetaMergeTo,
      gitUrl: remoteRepositoryUrl,
    };

    const createdMergeStateId = await mergeStateModel.createMergeStateIfNecessary(
      mergeFrom.rootIri, commitMessage, "merge", diffTreeComparisonResult,
      commonCommitHash, mergeFromInfo, mergeToInfo);
    return {
      createdMergeStateId,
      hasConflicts: diffTreeComparisonResult.conflicts.length > 0,
    };
}

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

    let newConflicts: DatastoreComparison[] = [];
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
      isBranch: mergeFrom.isBranch,
      branch: mergeFrom.branch,
      rootFullPathToMeta: pathToRootMetaMergeFrom,
      gitUrl: null,
    };

    const mergeToInfo: MergeEndInfoWithRootNode = {
      rootNode: rootMergeTo,
      filesystemType: mergeTo.filesystemType,
      lastCommitHash: mergeTo.lastCommitHash,
      isBranch: mergeTo.isBranch,
      branch: mergeTo.branch,
      rootFullPathToMeta: pathToRootMetaMergeTo,
      gitUrl: null,
    };

    const isSuccessfullyUpdated = await mergeStateModel.updateMergeStateToBeUpToDate(
      uuid, commitMessage, mergeStateCause, diffTreeComparisonResult,
      commonCommitHash, mergeFromInfo, mergeToInfo);
    return isSuccessfullyUpdated;
}