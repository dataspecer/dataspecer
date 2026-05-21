import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { GitProviderFactory } from "@dataspecer/git/git-providers";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { ScopeGroup } from "@dataspecer/auth";
import { findPatAccessTokens } from "@dataspecer/git";
import { getGitCredentialsFromSessionWithDefaults } from "../../authentication/auth-session.ts";


/**
 * Checks if the given hash on given branch on given remote repository is the hash of the HEAD of the branch
 *
 */
export const checkIfHashMatchesGitRemote = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    repositoryUrl: z.string().min(1),
    branch: z.string().min(1),
    hash: z.string().min(1),
  });

  const { repositoryUrl, branch, hash } = querySchema.parse(request.query);

  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(repositoryUrl, httpFetch, configuration);
  const repositoryOwner = gitProvider.extractPartOfRepositoryURL(repositoryUrl, "repository-owner");
  if (repositoryOwner === null) {
    throw new Error(`The given repository URL (${repositoryUrl}) is not valid, since we could not parse repository owner`);
  }
  const repositoryName = gitProvider.extractPartOfRepositoryURL(repositoryUrl, "repository-name");
  if (repositoryName === null) {
    throw new Error(`The given repository URL (${repositoryUrl}) is not valid, since we could not parse repository name`);
  }

  const { accessTokens } = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ScopeGroup.LoginInfo, ScopeGroup.FullPublicRepoControl, ScopeGroup.DeleteRepoControl]);
  const patAccessTokens = findPatAccessTokens(accessTokens);
  for (const patAccessToken of patAccessTokens) {
    const commitHashResult = await gitProvider.getLatestCommit(repositoryOwner, repositoryName, branch, patAccessToken.value);
    if (commitHashResult.type === "error") {
      response.status(commitHashResult.error.getStatusCode()).json(commitHashResult.error.message);
      return;
    }
    else {
      if (hash === commitHashResult.sha) {
        response.sendStatus(200);
      }
      else {
        response.sendStatus(409);
      }
      return;
    }
  }
  return;
});


