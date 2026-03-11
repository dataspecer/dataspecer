import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { mergeStateModel, resourceModel } from "../../main.ts";
import { GitPullBase, GitPullFields, MANUAL_CLONE_PATH_PREFIX } from "@dataspecer/git-node";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";
import { updateBlob, updateResourceMetadata } from "../resource.ts";
import { createFilesystemFactoryParams } from "../../utils/filesystem-helpers.ts";


/**
 * Handles request, usually manual from the user, that results in pulling the linked remote Git repository and updating Dataspecer accordingly.
 *  Either by updating the data or creating relevant merge state, all depending on the state of the Git remote and Dataspecer.
 */
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
  const filesystemConstructorParams = createFilesystemFactoryParams(true);
  const pullUpdateParams: GitPullFields = {
    iri: query.iri,
    gitProvider,
    branch: resource.branch,
    cloneURL: resource.linkedGitRepositoryURL,
    cloneDirectoryNamePrefix: MANUAL_CLONE_PATH_PREFIX,
    dsLastCommitHash: resource.lastCommitHash,
    resourceModelForDS: resourceModel,
    alwaysCreateMergeState: false,
    mergeStateModel: mergeStateModel,
    updateBlob: updateBlob,
    updateResourceMetadata: updateResourceMetadata,
    filesystemConstructorParams,
  };
  const pullContainer = new GitPullBase(pullUpdateParams);
  const createdMergeState = await pullContainer.updateDSRepositoryByGitPull();
  if (createdMergeState) {
    response.status(409).json("Created merge state");   // 409 is error code for conflict
    return;
  }
  else {
    response.sendStatus(200);
    return;
  }
});
