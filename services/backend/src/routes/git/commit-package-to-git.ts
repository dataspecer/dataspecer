// TODO RadStr: After long thinking the commit methods (both merge and classic commit) should be inside a class.
//              That would solve the issue of passing in ton of parameters. Since some of the values are set once and unchanged for the rest of the run.
//              The good news is that this seems to be the most (and probably only) problematic part of code with lot of parameters, which needs this form of rewrite.
//              Others are relatively fine.
// TODO RadStr: Another TODO just to be sure we will not forget is to fix the resource model passes in this file, which were added in this commit (the commit which introduces this new Resource Model Api)
//              And also fix the TODO name for the resource model interface


import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { mergeStateModel, resourceModel } from "../../main.ts";
import { BranchSummary, CommitResult, SimpleGit } from "simple-git";
import { extractPartOfRepositoryURL, getAuthorizationURL, GitIgnoreBase, GitProviderNode, stringToBoolean } from "@dataspecer/git";
import { AvailableFilesystems, ConfigType, GitCredentials, getMergeFromMergeToForGitAndDS, MergeStateCause, CommitHttpRedirectionCause, CommitRedirectResponseJson, MergeFromDataType, CommitConflictInfo, defaultBranchForPackageInDatabase, createUniqueCommitMessage } from "@dataspecer/git";
import { getGitCredentialsFromSessionWithDefaults } from "../../authentication/auth-session.ts";
import { AvailableExports } from "../../export-import/export-actions.ts";
import { getCommonCommitInHistory, gitCloneBasic, CreateSimpleGitResult, UniqueDirectory } from "@dataspecer/git-node/simple-git-methods";
import { compareBackendFilesystems, compareGitAndDSFilesystems } from "../../export-import/filesystem-abstractions/backend-filesystem-comparison.ts";
import { PackageExporterByResourceType } from "../../export-import/export-by-resource-type.ts";
import { MergeEndInfoWithRootNode, MergeEndpointForComparison, PrismaMergeStateWithData } from "../../models/merge-state-model.ts";
import fs from "fs";
import {
  checkErrorBoundaryForCommitAction, getLastCommit, getLastCommitHash, isDefaultBranch,
  removeEverythingExcept, removePathRecursively, createGitReadMeFile,
  createSimpleGitUsingPredefinedGitRoot,
  PUSH_PREFIX,
  MERGE_DS_CONFLICTS_PREFIX,
} from "@dataspecer/git-node";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { ResourceModelForFilesystemRepresentation } from "../../export-import/export.ts";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";


export type RepositoryIdentification = {
  repositoryOwner: string,
  repositoryName: string,
}

/**
 * {@link GitCommitToCreateInfoBasic} but no more ambiguities, everything is set
 */
type GitCommitToCreateInfoExplicitWithCredentials = {
  gitCredentials: GitCredentials,
  commitMessage: string,
  gitProvider: GitProviderNode,
  exportFormat: string | null,
  shouldAppendAfterDefaultMergeCommitMessage: boolean | null,
}

export type GitCommitToCreateInfoBasic = {
  commitMessage: string | null,
  gitProvider?: GitProviderNode,
  exportFormat: string | null,
}


export type CommitBranchAndHashInfo = {
  localBranch: string | null;
  localLastCommitHash: string;
  mergeFromData: MergeFromDataType | null;
}


/**
 * Same as {@link CommitBranchAndHashInfo}, but with renamed fields to mergeTo
 */
type CommitBranchAndHashInfoForMerge = {
  mergeToBranch: string | null;
  mergeToCommitHash: string;
  mergeFromData: MergeFromDataType | null;
  mergeFromResourceModel: ResourceModelForFilesystemRepresentation;
  mergeToResourceModel: ResourceModelForFilesystemRepresentation;
}


function convertBranchAndHashToMergeInfo(input: CommitBranchAndHashInfo): CommitBranchAndHashInfoForMerge {
  return {
    mergeToBranch: input.localBranch,
    mergeToCommitHash: input.localLastCommitHash,
    mergeFromData: input.mergeFromData === null ? null : {...input.mergeFromData},
    mergeFromResourceModel: null as any,
    mergeToResourceModel: null as any,
  };
}

/**
 * Commit to the repository for package identifier by given iri inside the query part of express http request.
 */
export const mergeCommitPackageToGitHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    commitMessage: z.string(),
    exportFormat: z.string().min(1).optional(),
    branchMergeFrom: z.string().min(1),
    lastCommitHashMergeFrom: z.string().min(1),
    rootIriMergeFrom: z.string().min(1),
    shouldRedirectWithExistenceOfMergeStates: z.string().min(1),
    shouldAppendAfterDefaultMergeCommitMessage: z.string().min(1),
  });

  const query = querySchema.parse(request.query);
  const shouldRedirectWithExistenceOfMergeStates = stringToBoolean(query.shouldRedirectWithExistenceOfMergeStates);
  const shouldAppendAfterDefaultMergeCommitMessage = stringToBoolean(query.shouldAppendAfterDefaultMergeCommitMessage);
  const {
    iri, exportFormat, commitMessage,
    branchMergeFrom, lastCommitHashMergeFrom, rootIriMergeFrom,
  } = query;
  const mergeFromData: MergeFromDataType = {
    branch: branchMergeFrom,
    commitHash: lastCommitHashMergeFrom,
    iri: rootIriMergeFrom,
  };

  const returnedStatus = await commitHandlerInternal(
    request, response, iri, mergeFromData, commitMessage, exportFormat,
    shouldRedirectWithExistenceOfMergeStates, false, shouldAppendAfterDefaultMergeCommitMessage);
});

/**
 * Commit to the repository for package identifier by given iri inside the query part of express http request.
 */
export const commitPackageToGitHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    commitMessage: z.string(),
    exportFormat: z.string().min(1).optional(),
    shouldAlwaysCreateMergeState: z.string().min(1),
    shouldRedirectWithExistenceOfMergeStates: z.string().min(1),
  });

  const query = querySchema.parse(request.query);
  const shouldAlwaysCreateMergeState = stringToBoolean(query.shouldAlwaysCreateMergeState);
  const shouldRedirectWithExistenceOfMergeStates = stringToBoolean(query.shouldRedirectWithExistenceOfMergeStates);
  const { iri, exportFormat, commitMessage } = query;
  await commitHandlerInternal(request, response, iri, null, commitMessage, exportFormat, shouldRedirectWithExistenceOfMergeStates, shouldAlwaysCreateMergeState, null);
});

const commitHandlerInternal = async (
  request: express.Request,
  response: express.Response,
  iri: string,
  mergeFromData: MergeFromDataType | null,
  originalCommitMessage: string,
  exportFormat: string | undefined,
  shouldRedirectWithExistenceOfMergeStates: boolean,
  shouldAlwaysCreateMergeState: boolean,
  shouldAppendAfterDefaultMergeCommitMessage: boolean | null,
) => {
  const transformedCommitMessage: string | null = originalCommitMessage.length === 0 ? null : originalCommitMessage;

  const resource = await resourceModel.getResource(iri);
  if (resource === null) {
    throw new Error(`Can not commit to git since the resource (iri: ${iri}) does not exist`);
  }
  const gitLink = resource.linkedGitRepositoryURL;
  const repositoryOwner = extractPartOfRepositoryURL(gitLink, "repository-owner");
  const repoName = extractPartOfRepositoryURL(gitLink, "repository-name");
  checkErrorBoundaryForCommitAction(gitLink, repoName, repositoryOwner);

  const branch = resource.branch === defaultBranchForPackageInDatabase ? null : resource.branch;
  const repositoryIdentificationInfo: RepositoryIdentification = {
    repositoryOwner: repositoryOwner!,
    repositoryName: repoName!,
  };

  if (shouldRedirectWithExistenceOfMergeStates) {
    // TODO RadStr: Not entirely sure about this ... I guess that I should just call merge commit explictly when finalizing instead of doing this, it will be easier to implement
    const mergeStatesForResource = await mergeStateModel.getMergeStatesForMergeTo(resource.iri, false);
    const resolvedMergeStatesCausedByMerge = mergeStatesForResource
      .filter(mergeState => mergeState.conflictCount === 0 && mergeState.mergeStateCause as MergeStateCause === "merge");
    if (mergeStatesForResource.length >= 1) {
      let redirectMessage = "There is at least one open merge state.";
      let redirectCause: CommitHttpRedirectionCause = CommitHttpRedirectionCause.HasAtLeastOneMergeStateActive;
      if (mergeStatesForResource.length === 1 && resolvedMergeStatesCausedByMerge.length === 1) {
        redirectMessage = "There is exactly one merge state caused by merge, which has 0 conflicts.";
        redirectCause = CommitHttpRedirectionCause.HasExactlyOneMergeStateAndItIsResolvedAndCausedByMerge;
      }
      const prismaMergeStateCausedByMerge: PrismaMergeStateWithData | null = redirectCause === CommitHttpRedirectionCause.HasAtLeastOneMergeStateActive ?
        null :
        {
          ...mergeStatesForResource[0],
          mergeStateData: null
        };
      const commitRedirectResponseJson: CommitRedirectResponseJson = {
        iri,
        redirectMessage,
        commitHttpRedirectionCause: redirectCause,
        openedMergeStatesCount: mergeStatesForResource.length,
        mergeStateUuids: mergeStatesForResource.map(mergeState => mergeState.uuid),
        commitMessage: originalCommitMessage,
        exportFormat: exportFormat ?? "json",
        mergeFromData,
        mergeStateCausedByMerge: redirectCause === CommitHttpRedirectionCause.HasAtLeastOneMergeStateActive ?
          null :
          // We use the merge state without diff data, so we do not need the diff data to be up to date
          await mergeStateModel.prismaMergeStateToMergeState(prismaMergeStateCausedByMerge!, false, false),
      };

      const status = 300;
      response.status(status).json(commitRedirectResponseJson);
      return status;
    }
  }

  const branchAndLastCommit: CommitBranchAndHashInfo = {
    localBranch: branch,
    localLastCommitHash: resource.lastCommitHash,
    mergeFromData,
  };

  const gitCommitInfo: GitCommitToCreateInfoBasic = {
    commitMessage: transformedCommitMessage,
    gitProvider: undefined,
    exportFormat: exportFormat ?? null
  };

  const commitConflictInfo = await commitPackageToGitUsingAuthSession(
    request, iri, gitLink, branchAndLastCommit, repositoryIdentificationInfo,
    response, gitCommitInfo, shouldAlwaysCreateMergeState, shouldAppendAfterDefaultMergeCommitMessage);

  if (commitConflictInfo !== null) {
    const status = 409;
    response.status(status).json(commitConflictInfo);
    return status;
  }

  const status = 200;
  response.sendStatus(status);
  return status;
}


/**
 * Gets authorization information from current session (if someting is missing use default bot credentials)
 *  and uses that information for the commit.
 * @returns null if there were no conflicts, otherwise to root iris of the conflict
 */
export const commitPackageToGitUsingAuthSession = async (
  request: express.Request,
  iri: string,
  remoteRepositoryURL: string,
  branchAndLastCommit: CommitBranchAndHashInfo,
  repositoryIdentificationInfo: RepositoryIdentification,
  response: express.Response,
  gitCommitInfoBasic: GitCommitToCreateInfoBasic,
  shouldAlwaysCreateMergeState: boolean,
  shouldAppendAfterDefaultMergeCommitMessage: boolean | null,
): Promise<CommitConflictInfo> => {
  const commitInfo: GitCommitToCreateInfoExplicitWithCredentials = prepareCommitDataForCommit(
    request, response, remoteRepositoryURL, gitCommitInfoBasic, shouldAppendAfterDefaultMergeCommitMessage);
  const commitConflictInfo = await commitPackageToGit(
    iri, remoteRepositoryURL, branchAndLastCommit, repositoryIdentificationInfo,
    commitInfo, shouldAlwaysCreateMergeState);
  return commitConflictInfo;
}

export function prepareCommitDataForCommit(
  request: express.Request,
  response: express.Response,
  remoteRepositoryURL: string,
  gitCommitInfoBasic: GitCommitToCreateInfoBasic,
  shouldAppendAfterDefaultMergeCommitMessage: boolean | null,
): GitCommitToCreateInfoExplicitWithCredentials {
  // If gitProvider not given - extract it from url
  const gitProvider = gitCommitInfoBasic.gitProvider ?? GitProviderNodeFactory.createGitProviderFromRepositoryURL(remoteRepositoryURL, httpFetch, configuration);
  const committer = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl]);
  const commitInfo: GitCommitToCreateInfoExplicitWithCredentials = {
    gitCredentials: committer,
    commitMessage: gitCommitInfoBasic.commitMessage ?? createUniqueCommitMessage(),
    gitProvider: gitProvider,
    exportFormat: gitCommitInfoBasic.exportFormat,
    shouldAppendAfterDefaultMergeCommitMessage,
  };

  return commitInfo;
}


// TODO RadStr Idea: Teoreticky bych mohl mit defaultni commit message ulozenou v konfiguraci (na druhou stranu vzdy chci zadat nejakou commit message)
/**
 * Commit to the repository for package identifier by given iri.
 * @param commitMessage if null then default message is used.
 * @param localLastCommitHash if empty string then there is no check for conflicts -
 *  it is expected to be the first commit on repository
 *  (however it also works the if we just want to set new last commit and
 *   do not want to cause any conflicts, we just commit current content and push it)
 * @returns true on successful commit. False when merge state was created (that is there were conflicts).
 */
export const commitPackageToGit = async (
  iri: string,
  remoteRepositoryURL: string,
  branchAndLastCommit: CommitBranchAndHashInfo,
  repositoryIdentificationInfo: RepositoryIdentification,
  commitInfo: GitCommitToCreateInfoExplicitWithCredentials,
  shouldAlwaysCreateMergeState: boolean,
): Promise<CommitConflictInfo> => {
  // Note that the logic for both is similiar create git, clone, check if should create merge state conflict, perform export and "force" push.
  if (branchAndLastCommit.mergeFromData === null) {
    return await commitClassicToGit(
      iri, remoteRepositoryURL, branchAndLastCommit.localBranch, branchAndLastCommit.localLastCommitHash,
      repositoryIdentificationInfo, commitInfo, resourceModel, shouldAlwaysCreateMergeState);
  }
  else {
    const mergeInfo = convertBranchAndHashToMergeInfo(branchAndLastCommit);
    return await commitDSMergeToGit(
      iri, remoteRepositoryURL, repositoryIdentificationInfo, commitInfo, mergeInfo, shouldAlwaysCreateMergeState);
  }
};



async function commitDSMergeToGit(
  iri: string,
  remoteRepositoryURL: string,
  repositoryIdentificationInfo: RepositoryIdentification,
  commitInfo: GitCommitToCreateInfoExplicitWithCredentials,
  mergeInfo: CommitBranchAndHashInfoForMerge,
  shouldAlwaysCreateMergeState: boolean,
): Promise<CommitConflictInfo> {
  // Note that the logic follows the classic commit method logic!!!
  // the explanation for isAfterFirstSucessfulClone is not here, but in the other method
  // The logic is create git, clone, check if should create merge state conflict, perform export and "force" merge/push.
  // Possible TODO: It would be good idea to refactor it, but the methods do slightly differ with the flow, so it is not as trivial as it seems.


  const { mergeToBranch, mergeToCommitHash } = mergeInfo;
  // Has to be defined, otherwise we should not call this
  const { branch: mergeFromBranch, commitHash: mergeFromCommitHash, iri: mergeFromIri } = mergeInfo.mergeFromData!;
  const { repositoryOwner, repositoryName } = repositoryIdentificationInfo;
  const { gitCredentials } = commitInfo;


  const createSimpleGitResult: CreateSimpleGitResult = createSimpleGitUsingPredefinedGitRoot(iri, MERGE_DS_CONFLICTS_PREFIX, true);
  const { git, gitInitialDirectory, gitInitialDirectoryParent } = createSimpleGitResult;
  let cloneResult: CloneBeforeMergeResult;
  let hashOfPerformedCommit: string | null = null;

  for (const accessToken of gitCredentials.accessTokens) {
    // Check comment in the method of the classic commit for explanation of this logic
    const isAfterFirstSucessfulClone = hashOfPerformedCommit !== null;

    const repoURLWithAuthorization = getAuthorizationURL(gitCredentials, accessToken, remoteRepositoryURL, repositoryOwner, repositoryName);
    const isLastAccessToken = accessToken === gitCredentials.accessTokens.at(-1);
    const hasSetLastCommit: boolean = mergeToCommitHash !== "";


    if (!isAfterFirstSucessfulClone) {
      cloneResult = await cloneBeforeMerge(git, gitInitialDirectory, repoURLWithAuthorization, mergeFromBranch, mergeToBranch, isLastAccessToken);
      if (!cloneResult.isClonedSuccessfully) {
        continue;
      }
    }
    // Once we get here the cloneResult is always set - either from current iteration (then we set it in the if)
    // or it comes from the previous iteration(s), in which we created commit,
    // since once we clone, there is no other way to fail then at push.

    const mergeFromBranchLog = await git.log([mergeFromBranch]);
    const lastMergeFromBranchCommitInGit = mergeFromBranchLog.latest?.hash;
    const mergeToBranchLog = await git.log([cloneResult!.mergeToBranchExplicitName]);
    const lastMergeToBranchCommitInGit = mergeToBranchLog.latest?.hash;
    const shouldTryCreateMergeState = (lastMergeFromBranchCommitInGit !== mergeFromCommitHash ||
                                      lastMergeToBranchCommitInGit !== mergeToCommitHash ||
                                      shouldAlwaysCreateMergeState) &&
                                      hasSetLastCommit &&
                                      !isAfterFirstSucessfulClone;

    if (shouldTryCreateMergeState) {
      const mergeFrom: MergeEndpointForComparison = {
        gitIgnore: new GitIgnoreBase(commitInfo.gitProvider),
        rootIri: mergeFromIri,
        filesystemType: AvailableFilesystems.DS_Filesystem,
        fullPathToRootParent: gitInitialDirectoryParent,
        resourceModel
      };

      const mergeTo: MergeEndpointForComparison = {
        gitIgnore: new GitIgnoreBase(commitInfo.gitProvider),
        rootIri: iri,
        filesystemType: AvailableFilesystems.DS_Filesystem,
        fullPathToRootParent: gitInitialDirectoryParent,
        resourceModel
      };

      const {
        diffTreeComparisonResult,
        rootMergeFrom,
        pathToRootMetaMergeFrom,
        filesystemMergeFrom,
        rootMergeTo,
        pathToRootMetaMergeTo,
        filesystemMergeTo,
      } = await compareBackendFilesystems(mergeFrom, mergeTo);

      const commonCommitHash = await getCommonCommitInHistory(git, mergeFromCommitHash, mergeToCommitHash);

      const mergeFromInfo: MergeEndInfoWithRootNode = {
        rootNode: rootMergeFrom,
        filesystemType: filesystemMergeFrom.getFilesystemType(),
        lastCommitHash: mergeFromCommitHash,
        isBranch: true,     // It has to be true, we do not allow it to not be branch, if it is we failed to perform the checks earlier. (probably on front end)
        branch: mergeFromBranch,
        rootFullPathToMeta: pathToRootMetaMergeFrom,
        gitUrl: remoteRepositoryURL,
      };
      const mergeToInfo: MergeEndInfoWithRootNode = {
        rootNode: rootMergeTo,
        filesystemType: filesystemMergeTo.getFilesystemType(),
        lastCommitHash: mergeToCommitHash,
        isBranch: true,
        branch: cloneResult!.mergeToBranchExplicitName,
        rootFullPathToMeta: pathToRootMetaMergeTo,
        gitUrl: remoteRepositoryURL,
      };

      const createdMergeStateId = await mergeStateModel.createMergeStateIfNecessary(
        iri, commitInfo.commitMessage, "merge", diffTreeComparisonResult, commonCommitHash, mergeFromInfo, mergeToInfo);
      if (diffTreeComparisonResult.conflicts.length > 0) {
        return {
          conflictMergeFromIri: mergeFrom.rootIri,
          conflictMergeToIri: mergeTo.rootIri,
        };
      }
      // Well now what? For some reason the merge state was not created, but I think that it always should be, since we are not matching the commit hashes.
      // Actually if we commit and then revert then we don't get conflicts
    }


    // If the merge from branch does not exist in git - push it
    // TODO RadStr: For now ... I guess that I will just force the user to create it otherwise he can not merge
    // TODO RadStr: Also sideways note ... I want to always perform merge on DS and GIT, since if I have perform merge on 2 DS branches, there is "small" issue -
    //              - The user can modify the merge from package, that is problem since then we are not actually performing merge in git (That is from fixed point in time),
    //                 but some weird semi-state merge
    // if (!cloneResult.mergeFromBranchExists) {
    //   await git.checkout(mergeFromBranch);
    //   await git.push(repoURLWithAuthorization);
    //   await git.checkout(mergeToBranchExplicit);
    // }


    const isMergingToDefaultBranch = await isDefaultBranch(git, cloneResult!.mergeToBranchExplicitName);
    const pushResult = await exportAndPushToGit(
      createSimpleGitResult, iri, repoURLWithAuthorization, commitInfo, hasSetLastCommit,
      mergeFromBranch, isLastAccessToken, hashOfPerformedCommit, isMergingToDefaultBranch, cloneResult!.mergeToBranchExists);

    hashOfPerformedCommit = pushResult.hashOfPeformedCommit;
    if (pushResult.isPushSuccessful) {
      return null;
    }
  }
  throw new Error("Unknown error when merging DS branches. This should be unreachable code. There were probably no access tokens available in DS at all");
}

async function commitClassicToGit(
  iri: string,
  remoteRepositoryURL: string,
  branch: string | null,
  localLastCommitHash: string,
  repositoryIdentificationInfo: RepositoryIdentification,
  commitInfo: GitCommitToCreateInfoExplicitWithCredentials,
  resourceModelForDS: ResourceModelForFilesystemRepresentation,
  shouldAlwaysCreateMergeState: boolean,
): Promise<CommitConflictInfo> {
  const { gitCredentials, gitProvider } = commitInfo;
  const { repositoryOwner, repositoryName } = repositoryIdentificationInfo;


  const createSimpleGitResult: CreateSimpleGitResult = createSimpleGitUsingPredefinedGitRoot(iri, PUSH_PREFIX, true);
  const { git, gitDirectoryToRemoveAfterWork, gitInitialDirectory, gitInitialDirectoryParent } = createSimpleGitResult;

  let isNewlyCreatedBranchPresentOnlyInDS: boolean = false;
  let hashOfPerformedCommit: string | null = null;
  for (const accessToken of gitCredentials.accessTokens) {
    // Note that once hashOfPerformedCommit is not null. That mean we did successfully clone in previous iteration(s).
    // We have already filled directory with the export and perform commit in the previous iteration.
    // The push must have failed in previous iteration,
    // since the export and commit should not fail unless there is a mistake in code.
    // Therefore, it is safe to assume, that either merge state was created (then we do not get here and exit early)
    // or if the hashOfPerformedCommit is not null, we just have to try pushing with the different tokens and skip all the other programming flow.
    const isAfterFirstSucessfulClone = hashOfPerformedCommit !== null;

    const repoURLWithAuthorization = getAuthorizationURL(gitCredentials, accessToken, remoteRepositoryURL, repositoryOwner, repositoryName);
    const isLastAccessToken = accessToken === gitCredentials.accessTokens.at(-1);
    const hasSetLastCommit: boolean = localLastCommitHash !== "";

    if (!isAfterFirstSucessfulClone) {
      const { isCloneSuccessful, isNewlyCreatedBranchOnlyInDS } = await cloneBeforeCommit(
        git, gitInitialDirectory, repoURLWithAuthorization, branch,
        localLastCommitHash, hasSetLastCommit, isLastAccessToken);
      if (!isCloneSuccessful) {
        continue;
      }

      isNewlyCreatedBranchPresentOnlyInDS = isNewlyCreatedBranchOnlyInDS;
    }

    const branchExplicit = (await git.branch()).current;
    if (hasSetLastCommit && !isAfterFirstSucessfulClone) {
      try {
        const remoteRepositoryLastCommitHash = await getLastCommitHash(git);
        const shouldTryCreateMergeState = localLastCommitHash !== remoteRepositoryLastCommitHash || shouldAlwaysCreateMergeState;
        if (shouldTryCreateMergeState) {
          const {
            diffTreeComparisonResult,
            rootMergeFrom,
            pathToRootMetaMergeFrom,
            filesystemMergeFrom,
            rootMergeTo,
            pathToRootMetaMergeTo,
            filesystemMergeTo,
          } = await compareGitAndDSFilesystems(new GitIgnoreBase(gitProvider), iri, gitInitialDirectoryParent, "push", resourceModelForDS);

          const commonCommitHash = await getCommonCommitInHistory(git, localLastCommitHash, remoteRepositoryLastCommitHash);
          const { valueMergeFrom: lastHashMergeFrom, valueMergeTo: lastHashMergeTo } = getMergeFromMergeToForGitAndDS("push", localLastCommitHash, remoteRepositoryLastCommitHash);
          const mergeFromInfo: MergeEndInfoWithRootNode = {
            rootNode: rootMergeFrom,
            filesystemType: filesystemMergeFrom.getFilesystemType(),
            lastCommitHash: lastHashMergeFrom,
            branch: branchExplicit,
            isBranch: true,     // Same as for merge. It has to be true, otherwise we failed some earlier check (probably on front end)
            rootFullPathToMeta: pathToRootMetaMergeFrom,
            gitUrl: remoteRepositoryURL,
          };
          const mergeToInfo: MergeEndInfoWithRootNode = {
            rootNode: rootMergeTo,
            filesystemType: filesystemMergeTo.getFilesystemType(),
            lastCommitHash: lastHashMergeTo,
            isBranch: true,
            branch: branchExplicit,
            rootFullPathToMeta: pathToRootMetaMergeTo,
            gitUrl: remoteRepositoryURL,
          };



          const createdMergeStateId = await mergeStateModel.createMergeStateIfNecessary(
            iri, commitInfo.commitMessage, "push", diffTreeComparisonResult, commonCommitHash, mergeFromInfo, mergeToInfo);
          if (diffTreeComparisonResult.conflicts.length > 0 || shouldAlwaysCreateMergeState) {
            return {
              conflictMergeFromIri: mergeFromInfo.rootNode.metadata.iri,
              conflictMergeToIri: mergeToInfo.rootNode.metadata.iri,
            };
          }
        }
      }
      catch(error) {
        // Remove only on failure, otherwise there is conflict and we want to keep it for merge state
        removePathRecursively(gitDirectoryToRemoveAfterWork);
        throw error;      // Rethrow
      }
    }

    const isCommittingToDefaultBranch = await isDefaultBranch(git, branchExplicit);
    const pushResult = await exportAndPushToGit(
      createSimpleGitResult, iri, repoURLWithAuthorization, commitInfo, hasSetLastCommit,
      null, isLastAccessToken, hashOfPerformedCommit, isCommittingToDefaultBranch, !isNewlyCreatedBranchPresentOnlyInDS);

    hashOfPerformedCommit = pushResult.hashOfPeformedCommit;
    if (pushResult.isPushSuccessful) {
      return null;
    }
  }

  throw new Error("Unknown error when commiting. This should be unreachable code. There were probably no access tokens available in DS at all");
}


type PushToGitResult = {
  isPushSuccessful: boolean;
  hashOfPeformedCommit: string | null;
}

/**
 * Note that if it is either the push failure on the last access token or the push was sucessful.
 *  Then the git project from the {@link createSimpleGitResult} is removed (meaning its directory).
 * @todo The removal of Git's directory is ok, but maybe it would be better to do it in the calling method.
 * @param mergeFromBranch if null, then it is classic commit, if not then merge commit
 * @param hashOfCommitToUse if null, then we do export, commit and push.
 *  If string then it is the commit hash to use. We will skip the export and commit steps and just perform the push
 * @returns True if successful. False if not and throws error if the failure was for the last access token
 */
async function exportAndPushToGit(
  createSimpleGitResult: CreateSimpleGitResult,
  iri: string,
  repoURLWithAuthorization: string,
  commitInfo: GitCommitToCreateInfoExplicitWithCredentials,
  hasSetLastCommit: boolean,
  mergeFromBranch: string | null,
  isLastAccessToken: boolean,
  hashOfCommitToUse: string | null,
  shouldContainWorkflowFiles: boolean,
  isBranchAlreadyTrackedOnRemote: boolean,
): Promise<PushToGitResult> {
  // Will be used in the result
  const shouldSkipCommitting = hashOfCommitToUse !== null;
  let hashOfPeformedCommit: string | null = hashOfCommitToUse;

  const isClassicCommit = mergeFromBranch === null;
  const { git, gitDirectoryToRemoveAfterWork } = createSimpleGitResult;
  const { commitMessage, gitCredentials, shouldAppendAfterDefaultMergeCommitMessage } = commitInfo;

  try {
    if (shouldSkipCommitting) {
      const isPushSuccessful = await pushToRemoteAndUpdateResourceGitMetadata(git, iri, repoURLWithAuthorization, hashOfCommitToUse, isClassicCommit);
      if (isPushSuccessful || isLastAccessToken) {
        removePathRecursively(gitDirectoryToRemoveAfterWork);
      }
      return {
        isPushSuccessful,
        hashOfPeformedCommit: hashOfCommitToUse,
      };    // We are done
    }

    let mergeMessage: string = "";
    if (mergeFromBranch !== null) {
      // We create the merge commit but actually do not commit, we will do that later.
      try {
        const mergeResult = await git.merge(["--no-commit", "--no-ff", mergeFromBranch]);
        console.info({mergeResult});    // TODO RadStr Debug: Debug print
      }
      catch(mergeError) {
        // Errors for example for conflicts, do not matter, we will override it anyways by just exporting the current content of the data specfication's merge to branch.
        console.info({mergeError});       // TODO RadStr Debug: Debug print
      }
      finally {
        if (shouldContainWorkflowFiles) {
          await git.raw(["restore", "--staged", commitInfo.gitProvider.getWorkflowFilesDirectoryName()]);
          await git.raw(["restore", commitInfo.gitProvider.getWorkflowFilesDirectoryName()]);
        }
      }

      // If the file does not exist, then it probably means that actually the merge from and merge to branch the same
      try {
        const fullMergeMessage = fs.readFileSync(`${createSimpleGitResult.gitInitialDirectory}/.git/MERGE_MSG`, "utf-8");
        mergeMessage = fullMergeMessage.substring(0, fullMergeMessage.indexOf("\n"));
      }
      catch(error) {
        throw new Error("The merge from branch was already merged. We can not merge again.");
      }
    }
    await fillGitDirectoryWithExport(
      iri, createSimpleGitResult, commitInfo.gitProvider, commitInfo.exportFormat,
      hasSetLastCommit, shouldContainWorkflowFiles, isBranchAlreadyTrackedOnRemote);

    // TODO RadStr Debug: Debug print to remove
    for (let i = 0; i < 10; i++) {
      console.info("*****************************************************");
    }

    // TODO RadStr Debug: Debug print to remove
    try {
      // Get list of all branches (local + remote)
      const branches = await git.branch(['-a']);

      for (const branchName of Object.keys(branches.branches)) {
        console.log(`\n=== History for branch: ${branchName} ===`);

        // Get commit history of each branch
        const log = await git.log([branchName]);

        log.all.forEach(commit => {
          console.log(`${commit.date} | ${commit.hash} | ${commit.message} | ${commit.author_name}`);
        });
      }
    }
    catch (err) {
      console.error('Error fetching history:', err);
    }

    let commitResult: CommitResult;
    if (mergeFromBranch === null) {
      commitResult = await createClassicGitCommit(git, ["."], commitMessage, gitCredentials.name, gitCredentials.email);
      hashOfPeformedCommit = commitResult.commit;
    }
    else {
      if (shouldAppendAfterDefaultMergeCommitMessage === null) {
        throw new Error("Programmer error - when creating merge commit the shouldAppendAfterDefaultMergeCommitMessage is set to null instead of being boolean");
      }

      commitResult = await createMergeCommit(
        git, ["."], mergeMessage, commitMessage,
        gitCredentials.name, gitCredentials.email, mergeFromBranch,
        shouldAppendAfterDefaultMergeCommitMessage);
      hashOfPeformedCommit = commitResult.commit;
    }

    // TODO RadStr Debug: Debug print to remove
    for (let i = 0; i < 10; i++) {
      console.info("-----------------------------------------------");
    }
    try {
      // Get list of all branches (local + remote)
      const branches = await git.branch(['-a']);

      for (const branchName of Object.keys(branches.branches)) {
        console.log(`\n=== History for branch: ${branchName} ===`);

        // Get commit history of each branch
        const log = await git.log([branchName]);

        log.all.forEach(commit => {
          console.log(`${commit.date} | ${commit.hash} | ${commit.message} | ${commit.author_name}`);
        });
      }
    }
    catch (err) {
      console.error('Error fetching history:', err);
    }


    const isPushSuccessful = await pushToRemoteAndUpdateResourceGitMetadata(git, iri, repoURLWithAuthorization, hashOfPeformedCommit, isClassicCommit);
    if (isPushSuccessful || isLastAccessToken) {
      removePathRecursively(gitDirectoryToRemoveAfterWork);
    }
    return {
      isPushSuccessful,
      hashOfPeformedCommit,
    };    // We are done
  }
  catch(error) {
    // Error can be caused by Not sufficient rights for the pushing - then we have to try all and fail on last
    if (isLastAccessToken) {
      // It is important to not only remove the actual files, but also the .git directory,
      // otherwise we would later also push the git history, which we don't want (unless we get the history through git clone)
      removePathRecursively(gitDirectoryToRemoveAfterWork);
      // If it is last then rethrow. Otherwise try again.
      throw error;
    }
    else {
      // TODO RadStr: Print the error for now, however it really should be only issue with rights
      console.error({error});
      return {
        isPushSuccessful: false,
        hashOfPeformedCommit,
      };
    }
  }
}


async function pushToRemoteAndUpdateResourceGitMetadata(
  git: SimpleGit,
  iri: string,
  repoURLWithAuthorization: string,
  commitHash: string,
  isClassicCommit: boolean,
): Promise<boolean> {
  if (commitHash !== "") {
    // We do not need any --force or --force-with-leash options, this is enough
    await git.push(repoURLWithAuthorization);
    const updateCause = isClassicCommit ? "push" : "merge";
    await resourceModel.updateLastCommitHash(iri, commitHash, updateCause);
    return true;
  }
  return false;
}


async function fillGitDirectoryWithExport(
  iri: string,
  gitPaths: UniqueDirectory,
  gitProvider: GitProviderNode,
  exportFormat: string | null,
  hasSetLastCommit: boolean,
  shouldContainWorkflowFiles: boolean,
  isBranchAlreadyTrackedOnRemote: boolean,
) {
  const { gitDirectoryToRemoveAfterWork, gitInitialDirectory, gitInitialDirectoryParent } = gitPaths;

  try {
    // Remove the content of the git directory and then replace it with the export
    // Alternatively we could keep the content and run await git.rm(['-r', '.']) ... however that would to know exactly
    //  what files were exported. So we can add them explicitly instead of running git add .
    const exceptionsForDirectoryRemoval = [".git", "README.md"];
    if (isBranchAlreadyTrackedOnRemote) {
      exceptionsForDirectoryRemoval.push(gitProvider.getWorkflowFilesDirectoryName());
    }
    removeEverythingExcept(gitInitialDirectory, exceptionsForDirectoryRemoval);
    const exporter = new PackageExporterByResourceType();
    // const exporter = new PackageExporterNew();     // TODO RadStr Debug: Debug
    await exporter.doExportFromIRI(
      iri, "", gitInitialDirectoryParent + "/", AvailableFilesystems.DS_Filesystem, AvailableExports.Filesystem,
      exportFormat ?? "json", resourceModel, null
    );

    if (shouldContainWorkflowFiles && !hasSetLastCommit) {
      createGitReadMeFile(gitInitialDirectory);
      gitProvider.copyWorkflowFiles(gitInitialDirectory);
    }
  }
  catch(error) {
    console.error("Failure when creating the export of repository for commit");
    removePathRecursively(gitDirectoryToRemoveAfterWork);
    throw error;
  }
}

type CloneBeforeMergeResult = {
  mergeFromBranchExists: boolean;
  mergeToBranchExists: boolean;
  mergeToBranchExplicitName: string;
  isClonedSuccessfully: boolean;
}

function isBranchPresentInBranchList(branches: BranchSummary, branch: string) {
  // We have to look for remotes of matching branch name. Because in git the local branch is not visible unless it was previously checkouted.
  const mergeFromBranchAsRemote = "remotes/origin/" + branch;
  const branchExists = branches.all.find(currBranch => mergeFromBranchAsRemote === currBranch) !== undefined;
  return branchExists;
}

async function checkoutBranchIfExists(git: SimpleGit, branches: BranchSummary, branch: string): Promise<boolean> {
  const branchExists = isBranchPresentInBranchList(branches, branch);
  if (branchExists) {
    await git.checkout(branch);
  }
  else {
    // TODO RadStr: Yeah I should either take it from the other Git in DS (but merges do not have other Git) or just throw error or force the Git to be up to date with the merge branches
    throw new Error("TODO RadStr: This is wrong. We have to create new branch from the other package content. If we ran just the git.branch([mergeFromBranch]), then we create branch with the same exact content as mergeTo. Which we do not want. We want mergeFrom");
    await git.checkoutLocalBranch(branch);
  }

  return branchExists;
}

/**
 * Note that method switches the git to the {@link mergeToBranch}.
 * @param mergeToBranch If null then it is considered to be the current branch (therefore it exists)
 */
async function cloneBeforeMerge(
  git: SimpleGit,
  gitInitialDirectory: string,
  repoURLWithAuthorization: string,
  mergeFromBranch: string,
  mergeToBranch: string | null,
  isLastAccessToken: boolean
): Promise<CloneBeforeMergeResult> {
  let cloneResult: CloneBeforeMergeResult;
  let mergeFromBranchExists: boolean = false;
  let mergeToBranchExists: boolean = false;

  try {
    // Just clone it full, we could perform some optimizations though, but merging is rare operation anyways
    await gitCloneBasic(git, gitInitialDirectory, repoURLWithAuthorization, false, false, undefined);
    const branches = await git.branch();

    if (mergeToBranch === null) {
      mergeToBranchExists = true;
    }
    else {
      mergeToBranchExists = await checkoutBranchIfExists(git, branches, mergeToBranch);
    }
    const mergeToBranchExplicitName = (await git.branch()).current;


    const currentBranch = (await git.branch()).current;
    mergeFromBranchExists = await checkoutBranchIfExists(git, branches, mergeFromBranch);
    await git.checkout(currentBranch);      // Go back to the mergeToBranch

    cloneResult = {
      mergeFromBranchExists,
      mergeToBranchExists,
      mergeToBranchExplicitName: mergeToBranchExplicitName,
      isClonedSuccessfully: true,
    };
  }
  catch(error) {
    cloneResult = {
      mergeFromBranchExists,
      mergeToBranchExists,
      mergeToBranchExplicitName: "",    // We failed anyways, so no need to provide correct value if it is present
      isClonedSuccessfully: false,
    };
  }

  if (isLastAccessToken && !cloneResult.isClonedSuccessfully) {
    throw new Error("Clone for merge failed for the last access token to check.");
  }

  return cloneResult;
}

async function cloneBeforeCommit(
  git: SimpleGit,
  gitInitialDirectory: string,
  repoURLWithAuthorization: string,
  branch: string | null,
  localLastCommitHash: string,
  hasSetLastCommit: boolean,
  isLastAccessToken: boolean
): Promise<{ isNewlyCreatedBranchOnlyInDS: boolean, isCloneSuccessful: boolean }> {
  let isNewlyCreatedBranchOnlyInDS = false;

  try {
    await gitCloneBasic(git, gitInitialDirectory, repoURLWithAuthorization, true, false, branch ?? undefined);
  }
  catch (cloneError: any) {
    try {
      // It is possible that the branch is newly created inside DS.
      // It is newly possible (since Git 2.49 from March 2025) to easily fetch specific commit using git options
      // https://stackoverflow.com/questions/31278902/how-to-shallow-clone-a-specific-commit-with-depth-1
      if (hasSetLastCommit) {
        const options = [
          "--depth", "1",
          "--revision", localLastCommitHash,
        ];
        await git.clone(repoURLWithAuthorization, ".", options);
        isNewlyCreatedBranchOnlyInDS = true;
      }
      else {
        // Just try to get whole history and hopefully it will work.
        await git.clone(repoURLWithAuthorization, ".");
      }
      if (branch !== null) {
        await git.checkoutLocalBranch(branch);
      }
    }
    catch(cloneError2: any)  {
      if (isLastAccessToken) {
        throw cloneError2;       // Every access token failed
      }
      return {
        isNewlyCreatedBranchOnlyInDS,
        isCloneSuccessful: false,
      };
    }
  }

  return {
    isNewlyCreatedBranchOnlyInDS,
    isCloneSuccessful: true,
  };
}

/**
 * Performs the git add and git commit with given {@link commitMessage}
 * Expects the {@link git} to be on correct branch.
 * @param files - Items can be both files and directories
 */
async function createClassicGitCommit(
  git: SimpleGit,
  files: string[],
  commitMessage: string,
  committerName: string,
  committerEmail: string,
) {
  await git.add(files);
  await setUserConfigForGitInstance(git, committerName, committerEmail);

  // We should already be on the correct branch
  const commitResult = await git.commit(commitMessage);
  return commitResult;
}

async function createMergeCommit(
  git: SimpleGit,
  files: string[],
  mergeDefaultCommitMessage: string,
  commitMessage: string,
  committerName: string,
  committerEmail: string,
  mergeFromBranchName: string,
  shouldAppendAfterDefaultMergeCommitMessage: boolean,
) {
  // TODO RadStr: Trying the following idea:
  // 1) Create merge state in git using git merge --no-ff
  //   - This tries merging, but never creates the actual merge commit
  // 2) Only reason why we did that is the get the default merge commit message, we get that from ".git/MERGE_MSG"
  // 3) Then we abort using --abort option
  // 4) Now to actally create the merge:
  //  a) Create normal commit
  //  b) Turn that commit into merge commit
  //  c) Modify the commit message
  // ... At first I thought that it is enough to use merge -s ours, however that does not consider staged file
  // ... Other alternative would be to Run "git merge --no-ff", remove the content of repository as we do. Then put in the new exported content and run git commit.
  // First we commit the current content of the repository

  console.info("Status before:");
  console.info(await git.status());
  await git.add(files);
  console.info("Status after add:");
  console.info(await git.status());
  await setUserConfigForGitInstance(git, committerName, committerEmail);
  await git.commit(mergeDefaultCommitMessage);
  const lastCommitMessage = (await getLastCommit(git))?.message ?? "";
  const commitMessages: string[] = [];
  if (shouldAppendAfterDefaultMergeCommitMessage) {
    commitMessages.push(mergeDefaultCommitMessage);
  }
  commitMessages.push(commitMessage);
  // Modify the message ... it keeps the old default text, but adds the new one
  // The --no-edit option is not needed since we provide the commit message explictly (othwerise the option ensures not open editor for the amend)
  return await git.commit(commitMessages, undefined, { "--amend": null, });
}

async function setUserConfigForGitInstance(git: SimpleGit, committerName: string, committerEmail: string) {
  const committerNameToUse = committerName;
  const committerEmailToUse = committerEmail;
  await git.addConfig("user.name", committerNameToUse);
  await git.addConfig("user.email", committerEmailToUse);
}