import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { CommitReferenceType, GitProvider } from "@dataspecer/git";
import { GitProviderFactory } from "../git-providers/git-provider-factory.ts";
import { v4 as uuidv4 } from "uuid";
import { resourceModel } from "../main.ts";


export const linkToExistingGitRepository = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    repositoryURL: z.string().min(1),
  });
  const { iri, repositoryURL } = querySchema.parse(request.query);
  const gitProvider: GitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(repositoryURL);
  const commitReferenceType: CommitReferenceType = "branch";
  const commitReferenceValue = (await gitProvider.extractCommitReferenceValue(repositoryURL, commitReferenceType)).commitReferenceValue;
  await updateGitRelatedDataForPackage(iri, gitProvider, repositoryURL, commitReferenceValue, commitReferenceType);
  // Ok, I think that if there was some failure, then it caused error and errors are handled by asyncHandler.
  response.sendStatus(200);
  return;
});

export const updateGitRelatedDataForPackage = async (
  iri: string,
  gitProvider: GitProvider,
  repositoryURL: string,
  commitReferenceValue: string | null,
  commitReferenceType?: CommitReferenceType,
) => {
  const defaultRepositoryUrl = gitProvider.extractDefaultRepositoryUrl(repositoryURL);
  console.info("defaultRepositoryUrl", defaultRepositoryUrl);
  // If we call it before we set the git link for the imported package, then we make the database query faster (we don't need to check for forbidden iri)
  resourceModel.updateResourceGitLink(iri, defaultRepositoryUrl, false);
  // If commitReferenceType still not set, just use null, the method will use its default
  const lastCommitHash = await gitProvider.getLastCommitHashFromUrl(defaultRepositoryUrl, commitReferenceType ?? null, commitReferenceValue);
  resourceModel.updateLastCommitHash(iri, lastCommitHash);

  // If undefined just assume that it is reference to commit, so if it is not user have to explictly switch it to branch
  resourceModel.updateRepresentsBranchHead(iri, commitReferenceType ?? "commit");
  if (commitReferenceType === "branch") {
    resourceModel.updateResourceProjectIriAndBranch(
      iri,
      undefined,
      commitReferenceValue ?? undefined);
  }
};
