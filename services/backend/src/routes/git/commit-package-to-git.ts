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
import { ExportVersionType, extractPartOfRepositoryURL, convertStringToExportVersion, MergeState, stringToBoolean, ExportFormatType, convertStringToExportFormat } from "@dataspecer/git";
import { ConfigType, GitCredentials, MergeStateCause, CommitHttpRedirectionCause, CommitRedirectResponseJson, MergeFromDataType, CommitConflictInfo, defaultBranchForPackageInDatabase, createUniqueCommitMessage } from "@dataspecer/git";
import { getGitCredentialsFromSessionWithDefaults } from "../../authentication/auth-session.ts";
import { PrismaMergeStateWithData } from "../../models/merge-state-model.ts";
import {
  checkErrorBoundaryForCommitAction,
  CommitBranchAndHashInfo,
  GitCommit,
  GitCommitBaseType,
  GitCommitConstructorParams,
  GitCommitToCreateInfoBasic,
  GitCommitToCreateInfoExplicitWithCredentials,
  GitRepositoryIdentification,
} from "@dataspecer/git-node";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";
import { createFilesystemFactoryParams } from "../../utils/filesystem-helpers.ts";

/**
 * Commit to the repository for package identifier by given iri inside the query part of express http request.
 * @todo Personally I would rewrite the commit related handlers to not get the configuration from client (exportFormat and exportVersion) from client,
 *  but rather read it on the server from the configuration. We did it for performance reasons, but if we keep adding configuration related to committing.
 *  It will get to complicated real quick and also it is kind of messy, that if we do it like this we have to extend each related handler any time we do it
 *  (that is commit, mergeCommit and create new repository handlers).
 */
export const mergeCommitPackageToGitHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    commitMessage: z.string(),
    exportFormat: z.string().min(1).optional(),
    exportVersion: z.string().min(1).optional(),
    branchMergeFrom: z.string().min(1),
    lastCommitHashMergeFrom: z.string().min(1),
    rootIriMergeFrom: z.string().min(1),
    shouldRedirectWithExistenceOfMergeStates: z.string().min(1),
    shouldAppendAfterDefaultMergeCommitMessage: z.string().min(1),
  });

  const query = querySchema.parse(request.query);
  const shouldRedirectWithExistenceOfMergeStates = stringToBoolean(query.shouldRedirectWithExistenceOfMergeStates);
  const shouldAppendAfterDefaultMergeCommitMessage = stringToBoolean(query.shouldAppendAfterDefaultMergeCommitMessage);
  const { iri, commitMessage, branchMergeFrom, lastCommitHashMergeFrom, rootIriMergeFrom } = query;

  const exportVersion = convertStringToExportVersion(query.exportVersion);
  const mergeFromData: MergeFromDataType = {
    branch: branchMergeFrom,
    commitHash: lastCommitHashMergeFrom,
    iri: rootIriMergeFrom,
  };

  const exportFormat = convertStringToExportFormat(query.exportFormat);

  const returnedStatus = await commitHandlerInternal(
    request, response, iri, mergeFromData, commitMessage, exportFormat, exportVersion,
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
    exportVersion: z.string().min(1).optional(),
    shouldAlwaysCreateMergeState: z.string().min(1),
    shouldRedirectWithExistenceOfMergeStates: z.string().min(1),
  });

  const query = querySchema.parse(request.query);
  const shouldAlwaysCreateMergeState = stringToBoolean(query.shouldAlwaysCreateMergeState);
  const shouldRedirectWithExistenceOfMergeStates = stringToBoolean(query.shouldRedirectWithExistenceOfMergeStates);
  const { iri, commitMessage } = query;
  const exportVersion = convertStringToExportVersion(query.exportVersion);
  const exportFormat = convertStringToExportFormat(query.exportFormat);
  await commitHandlerInternal(request, response, iri, null, commitMessage, exportFormat, exportVersion, shouldRedirectWithExistenceOfMergeStates, shouldAlwaysCreateMergeState, null);
});

/**
 * The internal commit method used by both the merge and classic commit requests.
 * Note that the method also handles the response with setting and sending the response status code and so on.
 *
 * @returns The HTTP response code.
 */
const commitHandlerInternal = async (
  request: express.Request,
  response: express.Response,
  iri: string,
  mergeFromData: MergeFromDataType | null,
  originalCommitMessage: string,
  exportFormat: ExportFormatType,
  exportVersion: ExportVersionType,
  shouldRedirectWithExistenceOfMergeStates: boolean,
  shouldAlwaysCreateMergeState: boolean,
  shouldAppendAfterDefaultMergeCommitMessage: boolean | null,
) => {
  const transformedCommitMessage: string | null = originalCommitMessage.length === 0 ? null : originalCommitMessage;

  const resource = await resourceModel.getResource(iri);
  if (resource === null) {
    throw new Error(`Can not commit to git since the resource (iri: ${iri}) does not exist`);
  }
  const remoteRepositoryUrl = resource.linkedGitRepositoryURL;
  const repositoryOwner = extractPartOfRepositoryURL(remoteRepositoryUrl, "repository-owner");
  const repoName = extractPartOfRepositoryURL(remoteRepositoryUrl, "repository-name");
  checkErrorBoundaryForCommitAction(remoteRepositoryUrl, repoName, repositoryOwner);

  const branch = resource.branch === defaultBranchForPackageInDatabase ? null : resource.branch;
  const repositoryIdentificationInfo: GitRepositoryIdentification = {
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
      let prismaMergeStateCausedByMerge: PrismaMergeStateWithData | null;
      let mergeStateCausedByMerge: MergeState | null;
      if (mergeStatesForResource.length === 1 && resolvedMergeStatesCausedByMerge.length === 1) {
        redirectMessage = "There is exactly one merge state caused by merge, which has 0 conflicts.";
        redirectCause = CommitHttpRedirectionCause.HasExactlyOneMergeStateAndItIsResolvedAndCausedByMerge;
        prismaMergeStateCausedByMerge = {
          ...mergeStatesForResource[0],
          mergeStateData: null
        };
        mergeStateCausedByMerge = await mergeStateModel.prismaMergeStateToMergeState(prismaMergeStateCausedByMerge!, false, false);
      }
      else {
        prismaMergeStateCausedByMerge = null;
        mergeStateCausedByMerge = null;
      }

      const commitRedirectResponseJson: CommitRedirectResponseJson = {
        iri,
        redirectMessage,
        commitHttpRedirectionCause: redirectCause,
        openedMergeStatesCount: mergeStatesForResource.length,
        mergeStateUuids: mergeStatesForResource.map(mergeState => mergeState.uuid),
        commitMessage: originalCommitMessage,
        exportFormat: exportFormat,
        exportVersion: exportVersion,
        mergeFromData,
        mergeStateCausedByMerge,
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
    exportFormat: exportFormat,
    exportVersion: exportVersion,
  };

  const commitParams: CommitUsingAuthSessionParams = {
    iri,
    request,
    response,
    branchAndLastCommit,
    repositoryIdentificationInfo,
    gitCommitInfoBasic: gitCommitInfo,
    shouldAlwaysCreateMergeState,
    shouldAppendAfterDefaultMergeCommitMessage,
    remoteRepositoryUrl,
  };
  const commitConflictInfo: CommitConflictInfo = await commitPackageToGitUsingAuthSession(commitParams);

  if (commitConflictInfo !== null) {
    const status = 409;
    response.status(status).json(commitConflictInfo);
    return status;
  }

  const status = 200;
  response.sendStatus(status);
  return status;
}

export type CommitUsingAuthSessionParams = {
  request: express.Request;
  response: express.Response;
  gitCommitInfoBasic: GitCommitToCreateInfoBasic;
  shouldAppendAfterDefaultMergeCommitMessage: boolean | null;
} & GitCommitBaseType;

/**
 * Gets authorization information from current session (if someting is missing use default bot credentials)
 *  and uses that information for the commit.
 * @returns null if there were no conflicts, otherwise to root iris of the conflict
 */
export const commitPackageToGitUsingAuthSession = async (
  commitParams: CommitUsingAuthSessionParams,
): Promise<CommitConflictInfo> => {
  const {
    branchAndLastCommit, gitCommitInfoBasic, iri, remoteRepositoryUrl, repositoryIdentificationInfo,
    request, response, shouldAlwaysCreateMergeState, shouldAppendAfterDefaultMergeCommitMessage,
   } = commitParams;
  const commitInfo: GitCommitToCreateInfoExplicitWithCredentials = prepareCommitDataForCommit(
    request, response, remoteRepositoryUrl, gitCommitInfoBasic, shouldAppendAfterDefaultMergeCommitMessage);
  const commitObjectParams: GitCommitConstructorParams = {
    iri,
    branchAndLastCommit,
    commitInfo,
    filesystemFactoryParams: createFilesystemFactoryParams(true),
    mergeStateModel: mergeStateModel,
    remoteRepositoryUrl,
    repositoryIdentificationInfo,
    shouldAlwaysCreateMergeState,
  };
  const gitCommitObject = new GitCommit(commitObjectParams);
  const commitConflictInfo = await gitCommitObject.commitPackageToGit();
  return commitConflictInfo;
}

/**
 * @returns The data which will be used for the commit. Check the return type for more information.
 *  Note that Git credentials are described in the {@link GitCredentials} type.
 * @param commitMessage if null then default message is used.
 */
export function prepareCommitDataForCommit(
  request: express.Request,
  response: express.Response,
  remoteRepositoryUrl: string,
  gitCommitInfoBasic: GitCommitToCreateInfoBasic,
  shouldAppendAfterDefaultMergeCommitMessage: boolean | null,
): GitCommitToCreateInfoExplicitWithCredentials {
  // If gitProvider not given - extract it from url
  const gitProvider = gitCommitInfoBasic.gitProvider ?? GitProviderNodeFactory.createGitProviderFromRepositoryURL(remoteRepositoryUrl, httpFetch, configuration);
  const committer = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl]);
  const commitInfo: GitCommitToCreateInfoExplicitWithCredentials = {
    gitCredentials: committer,
    commitMessage: gitCommitInfoBasic.commitMessage ?? createUniqueCommitMessage(),
    gitProvider: gitProvider,
    exportFormat: gitCommitInfoBasic.exportFormat,
    exportVersion: gitCommitInfoBasic.exportVersion,
    shouldAppendAfterDefaultMergeCommitMessage,
  };

  return commitInfo;
}
