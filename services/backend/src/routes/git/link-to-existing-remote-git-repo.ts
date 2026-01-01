import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { CommitReferenceType, GitProviderNode } from "@dataspecer/git";
import { resourceModel } from "../../main.ts";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";


/**
 * Only time you should ever use this is if you don't want to create repository from DS.
 * So you create EMPTY (!!!) repository and link it. Note that if it is not empty the behavior may get really weird. Because of the project iris.
 *
 */
export const linkToExistingGitRepository = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    repositoryURL: z.string().min(1),
  });
  const { iri, repositoryURL } = querySchema.parse(request.query);
  const gitProvider: GitProviderNode = GitProviderNodeFactory.createGitProviderFromRepositoryURL(repositoryURL, httpFetch, configuration);
  const commitReferenceType: CommitReferenceType = "branch";
  const commitReferenceValue = (await gitProvider.extractCommitReferenceValue(repositoryURL, commitReferenceType)).commitReferenceValue;
  await updateGitRelatedDataForPackage(iri, gitProvider, repositoryURL, commitReferenceValue, commitReferenceType);
  // Ok, I think that if there was some failure, then it caused error and errors are handled by asyncHandler.
  response.sendStatus(200);
  return;
});

export const updateGitRelatedDataForPackage = async (
  iri: string,
  gitProvider: GitProviderNode,
  repositoryURL: string,
  commitReferenceValue: string | null,
  commitReferenceType?: CommitReferenceType,
) => {
  // tohle bych dal do resource modelu asi
  const defaultRepositoryUrl = gitProvider.extractDefaultRepositoryUrl(repositoryURL);
  console.info("defaultRepositoryUrl", defaultRepositoryUrl);     // TODO RadStr Debug: Debug print
  // TODO RadStr: Ideally we should update all at once so we do not call the merge state isUpToDate setter unnecesarily

  // The true here is important - it sets the projectIri to the existing resources if they exist. That being said in case of import those should be already set from the meta file
  //  (so possible TODO: Remove the linkToExistingGitRepository and then we can call this with false)
  await resourceModel.updateResourceGitLink(iri, defaultRepositoryUrl, true);
  // If commitReferenceType still not set, just use null, the method will use its default
  const lastCommitHash = await gitProvider.getLastCommitHashFromUrl(defaultRepositoryUrl, commitReferenceType ?? null, commitReferenceValue);
  await resourceModel.updateLastCommitHash(iri, lastCommitHash, "pull");

  // If undefined just assume that it is reference to commit, so if it is not user have to explictly switch it to branch
  await resourceModel.updateRepresentsBranchHead(iri, commitReferenceType ?? "commit");
  await resourceModel.updateResourceProjectIriAndBranch(
    iri,
    undefined,      // Should be already set correctly
    commitReferenceValue ?? undefined);
  await resourceModel.setHasUncommittedChanges(iri, false);
};
