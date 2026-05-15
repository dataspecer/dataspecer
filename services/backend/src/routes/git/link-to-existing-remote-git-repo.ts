import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { CommitReferenceType, GitProviderNode } from "@dataspecer/git";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";
import { updateGitRelatedDataForPackage } from "../resource.ts";
import { resourceModel } from "../../main.ts";


/**
 * Only time you should ever use this is if you don't want to create repository from DS.
 * So you create EMPTY (!!!) repository and link it. Note that if it is not empty the behavior may get really weird. Because of the project iris.
 *
 */
export const linkToExistingGitRepository = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    repositoryURL: z.string(),
  });
  const { iri, repositoryURL } = querySchema.parse(request.query);
  if (repositoryURL === "") {
    await resourceModel.updateResourceGitLink(iri, "", false);
  }
  else {
    const gitProvider: GitProviderNode = GitProviderNodeFactory.createGitProviderFromRepositoryURL(repositoryURL, httpFetch, configuration);
    const commitReferenceType: CommitReferenceType = "branch";
    const commitReferenceValue = (await gitProvider.extractCommitReferenceValue(repositoryURL, commitReferenceType)).commitReferenceValue;
    await updateGitRelatedDataForPackage(iri, gitProvider, repositoryURL, commitReferenceValue, commitReferenceType);
  }
  await resourceModel.setHasUncommittedChanges(iri, true);
  // Ok, I think that if there was some failure, then it caused error and errors are handled by asyncHandler.
  response.sendStatus(200);
  return;
});
