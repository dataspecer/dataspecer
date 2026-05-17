import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { mergeStateModel, resourceModel } from "../../main.ts";
import { GitPull, GitPullFields, MANUAL_CLONE_PATH_PREFIX } from "@dataspecer/git-node";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";
import { updateBlob, updateResourceMetadata } from "../resource.ts";
import { createFilesystemFactoryParams } from "../../utils/filesystem-helpers.ts";
import { ErrorDefinitionConstantsClass } from "@dataspecer/git";


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
    projectIri: resource.projectIri,
    gitProvider,
    branch: resource.branch,
    cloneURL: resource.linkedGitRepositoryURL,
    cloneDirectoryNamePrefix: MANUAL_CLONE_PATH_PREFIX,
    dsLastCommitHash: resource.lastCommitHash,
    alwaysCreateMergeState: false,
    mergeStateModel: mergeStateModel,
    updateBlob: updateBlob,
    updateResourceMetadata: updateResourceMetadata,
    filesystemConstructorParams,
  };
  const pullContainer = new GitPull(pullUpdateParams);

  try {
    const result = await pullContainer.updateDSRepositoryByGitPull();
    if (result.hashMatch) {
      response.sendStatus(204);
      return;
    }
    else if (result.createdMergeState) {
      response.status(409).json("Created merge state");   // 409 is error code for conflict
      return;
    }
    else {
      await resourceModel.setHasUncommittedChanges(query.iri, false);     // TODO RadStr: 99% Correct - Just hardcode it instead of perfoming comparison, that being said it should be correct
      //                                                                  //                  Technically, this happens only when there are no changes, so we just confirm it
      response.sendStatus(200);
      return;
    }
  }
  catch (error: any) {
    if (error?.message?.startsWith("Unexpected token")) {
      const errorMsg = ErrorDefinitionConstantsClass.convertToFrontendResponseMessage(ErrorDefinitionConstantsClass.INVALID_FORMAT_ON_PULL + "\n" + error.message);
      response.status(500).json(errorMsg);
      return;
    }
    throw error;
  }
});
