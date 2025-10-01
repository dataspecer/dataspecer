import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import fs from "fs";
import { GitProvider } from "@dataspecer/git";
import { GitProviderFactory } from "../git-providers/git-provider-factory.ts";
import { saveChangesInDirectoryToBackendFinalVersion } from "./git-webhook-handler.ts";
import { resourceModel } from "../main.ts";
import { createSimpleGit, getCommonCommitInHistory, gitCloneBasic } from "../utils/simple-git-utils.ts";
import { AllowedPublicPrefixes, MANUAL_CLONE_PATH_PREFIX } from "../models/git-store-info.ts";
import { getLastCommitHash, removePathRecursively } from "../utils/git-utils.ts";



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

  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(resource.linkedGitRepositoryURL);

  const isCloneSuccess = await updateDSRepositoryByPullingGit(query.iri, gitProvider, resource.branch, resource.linkedGitRepositoryURL, MANUAL_CLONE_PATH_PREFIX, resource.lastCommitHash);
  if (isCloneSuccess) {
    response.sendStatus(200);
    return;
  }
  else {
    response.status(404).json("Cloning Failed");
    return;
  }
});

/**
 * @param depth is the number of commits to clone. In case of webhooks this number is given in the webhook payload. For normal pull we have to clone whole history.
 *
 * @returns Return false if cloning failed. We don't differ between error in cloning and updating, however the error in updating is not an error, it just means there were conflicts
 */
export const updateDSRepositoryByPullingGit = async (
  iri: string,
  gitProvider: GitProvider,
  branch: string,
  cloneURL: string,
  cloneDirectoryNamePrefix: AllowedPublicPrefixes,
  dsLastCommitHash: string,
  depth?: number
): Promise<boolean> => {
  const { git, gitInitialDirectory, gitInitialDirectoryParent, gitDirectoryToRemoveAfterWork } = createSimpleGit(iri, cloneDirectoryNamePrefix);
  let hasConflicts: boolean = false;
  try {
    // TODO RadStr: Not sure if it is better to pull only commits or everything
    await gitCloneBasic(git, gitInitialDirectory, cloneURL, true, true, branch, depth);
    // await saveChangesInDirectoryToBackendFinalVersion(gitInitialDirectory, iri, gitProvider, true);    // TODO RadStr: Not sure about setting the metadata cache (+ we need it always in the call, so the true should be actaully set inside the called method, and the argument should not be here at all)
    const gitLastCommitHash = await getLastCommitHash(git);
    const commonCommit = await getCommonCommitInHistory(git, dsLastCommitHash, gitLastCommitHash);
    hasConflicts = await saveChangesInDirectoryToBackendFinalVersion(
      gitInitialDirectoryParent, iri, gitProvider, true,
      dsLastCommitHash, gitLastCommitHash, commonCommit, branch, "pull");    // TODO RadStr: Not sure about setting the metadata cache (+ we need it always in the call, so the true should be actaully set inside the called method, and the argument should not be here at all)
  }
  catch (cloneError) {
    console.error({cloneError});
    throw cloneError;     // TODO RadStr: For now rethrow, just for debugging
    return false;
  }
  finally {
    if (hasConflicts) {
      return true;
    }
    // It is important to not only remove the actual files, but also the .git directory,
    // otherwise we would later also push the git history, which we don't want (unless we get the history through git clone)
    removePathRecursively(gitDirectoryToRemoveAfterWork);
  }
  return true;
};
