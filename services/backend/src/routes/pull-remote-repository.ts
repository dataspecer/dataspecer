import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import fs from "fs";
import { simpleGit } from "simple-git";
import { GitProvider, GitProviderFactory } from "../git-providers/git-provider-api.ts";
import { saveChangesInDirectoryToBackendFinalVersion } from "./git-webhook-handler.ts";
import { resourceModel } from "../main.ts";
import { createSimpleGit } from "../utils/simple-git-utils.ts";



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

  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(resource.linkedGitRepositoryURL);

  const isCloneSuccess = await updateDSRepositoryByPullingGit(query.iri, gitProvider, resource.branch, resource.linkedGitRepositoryURL, "manual-clone");
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
  cloneDirectoryNamePrefix: string,
  depth?: number
): Promise<boolean> => {
  const { git, gitInitialDirectory, gitInitialDirectoryParent } = createSimpleGit(iri, branch, cloneDirectoryNamePrefix);
  try {
    // TODO: Compare SHAs (and maybe behave differently based on number of commits)
    console.info("Before cloning repo");
    const cloneOptions = [
      "--branch", branch,
      "--single-branch",
    ];
    if (depth !== undefined) {
      cloneOptions.push("--depth", depth.toString());
    }
    await git.clone(cloneURL, ".", cloneOptions);
    console.info("After cloning repo");
    // await saveChangesInDirectoryToBackendFinalVersion(gitInitialDirectory, iri, gitProvider, true);    // TODO RadStr: Not sure about setting the metadata cache (+ we need it always in the call, so the true should be actaully set inside the called method, and the argument should not be here at all)
    await saveChangesInDirectoryToBackendFinalVersion(gitInitialDirectoryParent, iri, gitProvider, true);    // TODO RadStr: Not sure about setting the metadata cache (+ we need it always in the call, so the true should be actaully set inside the called method, and the argument should not be here at all)
    console.info("Saved repo");
  }
  catch (cloneError) {
    // TODO RadStr: We also end up here when repo is created, since creating branch triggers push webhook
    console.info("Catched clone error: ", { cloneError, cloneURL, iri, depth});
    return false;
  }
  finally {
    // TODO: Not sure about doing this in finally
    // It is important to not only remove the actual files, but also the .git directory,
    // otherwise we would later also push the git history, which we don't want (unless we get the history through git clone)
    fs.rmSync(gitInitialDirectory, { recursive: true, force: true });
  }

  return true;
};
