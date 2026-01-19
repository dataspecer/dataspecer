import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { GitProvider } from "@dataspecer/git";
import { saveChangesInDirectoryToBackendFinalVersion, GitChangesToDSPackageStoreResult } from "./git-webhook-handler.ts";
import { resourceModel } from "../../main.ts";
import { getCommonCommitInHistory, gitCloneBasic } from "@dataspecer/git-node/simple-git-methods";
import { AllowedPrefixes, createSimpleGitUsingPredefinedGitRoot, getLastCommitHash, MANUAL_CLONE_PATH_PREFIX, removePathRecursively } from "@dataspecer/git-node";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { ResourceModelForPull } from "../../export-import/export.ts";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";


export const pullRemoteRepository = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });
  const query = querySchema.parse(request.query);

  const resource = await resourceModel.getPackage(query.iri);
  if (resource === null) {
    response.status(404).json("The resource (package) does not exist in database");
    return;
  }
  if (!resource.representsBranchHead) {
    response.status(400);
    response.send("Does not point to branch, but commit, can not pull");
    return;
  }

  const gitProvider = GitProviderNodeFactory.createGitProviderFromRepositoryURL(resource.linkedGitRepositoryURL, httpFetch, configuration);
  const pullUpdateParams: UpdateDSRepositoryByGitPullParams = {
    iri: query.iri,
    gitProvider,
    branch: resource.branch,
    cloneURL: resource.linkedGitRepositoryURL,
    cloneDirectoryNamePrefix: MANUAL_CLONE_PATH_PREFIX,
    dsLastCommitHash: resource.lastCommitHash,
    resourceModelForDS: resourceModel,
  };
  const createdMergeState = await updateDSRepositoryByGitPull(pullUpdateParams);
  if (createdMergeState) {
    response.status(409).json("Created merge state");   // 409 is error code for conflict
    return;
  }
  else {
    response.sendStatus(200);
    return;
  }
});


export type UpdateDSRepositoryByGitPullParams = {
  iri: string,
  gitProvider: GitProvider,
  branch: string,
  cloneURL: string,
  cloneDirectoryNamePrefix: AllowedPrefixes,
  dsLastCommitHash: string,
  resourceModelForDS: ResourceModelForPull,
  depth?: number,
}

/**
 * @param depth is the number of commits to clone. In case of webhooks this number is given in the webhook payload. For normal pull we have to clone whole history.
 *
 * @returns Return true if merge state was created
 */
export const updateDSRepositoryByGitPull = async (
  parameters: UpdateDSRepositoryByGitPullParams,
): Promise<boolean> => {
  const { iri, gitProvider, branch, cloneURL, cloneDirectoryNamePrefix, dsLastCommitHash, resourceModelForDS, depth } = parameters;
  const { git, gitInitialDirectory, gitInitialDirectoryParent, gitDirectoryToRemoveAfterWork } = createSimpleGitUsingPredefinedGitRoot(iri, cloneDirectoryNamePrefix, true);
  let storeResult: GitChangesToDSPackageStoreResult | null = null;
  try {
    // TODO RadStr turn into TODO later: Not sure if it is better to pull only commits or everything -- I think that only commits is better
    await gitCloneBasic(git, gitInitialDirectory, cloneURL, true, true, branch, depth);
    const gitLastCommitHash = await getLastCommitHash(git);
    const commonCommit = await getCommonCommitInHistory(git, dsLastCommitHash, gitLastCommitHash);
    storeResult = await saveChangesInDirectoryToBackendFinalVersion(
      cloneURL, git, gitInitialDirectoryParent, iri, gitProvider,
      dsLastCommitHash, gitLastCommitHash, commonCommit, branch, "pull", resourceModelForDS);
  }
  catch (cloneError) {
    throw cloneError;
  }
  finally {
    if (storeResult !== null && storeResult.createdMergeState) {
      return true;
    }
    // It is important to not only remove the actual files, but also the .git directory,
    // otherwise we would later also push the git history, which we don't want (unless we get the history through git clone)
    removePathRecursively(gitDirectoryToRemoveAfterWork);
  }

  return storeResult?.createdMergeState ?? false;     // Wrong Typescript type, the value still can be null, if we throw error before setting the value
};
