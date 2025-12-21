import { z } from "zod";
import { getGitCredentialsFromSessionWithDefaults } from "../authorization/auth-session.ts";
import { GitProviderFactory } from "../git-providers/git-provider-factory.ts";
import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { ConfigType, extractPartOfRepositoryURL, findPatAccessTokens } from "@dataspecer/git";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";

/**
 * Removes Git repository with iri given in query part of request.
 */
export const removeGitRepository = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });

  const query = querySchema.parse(request.query);

  const repositoryURL = (await resourceModel.getResource(query.iri))?.linkedGitRepositoryURL;
  // TODO: Should check for URL validness rather than it being undefined
  if (repositoryURL === undefined) {
    throw new Error("Repository URL is undefined");   // This happens because of the resource missing rather than URL
  }

  const repositoryUserName = extractPartOfRepositoryURL(repositoryURL, "user-name");
  if (repositoryUserName === null) {
    throw new Error(`Can not extract user name from repository URL: ${repositoryURL}`);
  }

  const repoName = extractPartOfRepositoryURL(repositoryURL, "repository-name");
  if (repoName === null) {
    throw new Error(`Can not extract repository name from repository URL: ${repositoryURL}`);
  }

  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(repositoryURL, httpFetch);
  const { accessTokens } = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ConfigType.DeleteRepoControl]);
  const patAccessTokens = findPatAccessTokens(accessTokens);
  for (const patAccessToken of patAccessTokens) {
    try {
      const fetchResponseForRemove = await gitProvider.removeRemoteRepository(patAccessToken.value, repositoryUserName, repoName);
      if (!(fetchResponseForRemove.status === 404 || (fetchResponseForRemove.status >= 200 && fetchResponseForRemove.status < 300))) {
        continue;
      }
      // If either already removed or we removed it now, then we can safely remove the url from the database, since either it no longer exists or we successfully removed it

      console.info("Git link before removal:", (await resourceModel.getResource(query.iri))?.linkedGitRepositoryURL);
      const irisToUpdate = await resourceModel.removeGitLinkFromResourceModel(repositoryURL);
      console.info("Git link after removal:", (await resourceModel.getResource(query.iri))?.linkedGitRepositoryURL);

      response.status(200);
      response.json({irisToUpdate})
      return;
    }
    catch {
      // Empty
    }
  }

  throw new Error(`Failed to remove remote repository`);
});
