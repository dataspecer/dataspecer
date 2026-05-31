import { z } from "zod";
import { getGitCredentialsFromSessionWithDefaults } from "../../authentication/auth-session.ts";
import { resourceModel } from "../../main.ts";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { extractPartOfRepositoryURL, findPatAccessTokens } from "@dataspecer/git";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";
import { ScopeGroup } from "@dataspecer/auth";
import { FetchResponse } from "@dataspecer/core/io/fetch/fetch-api";

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

  const repositoryOwner = extractPartOfRepositoryURL(repositoryURL, "repository-owner");
  if (repositoryOwner === null) {
    throw new Error(`Can not extract user name from repository URL: ${repositoryURL}`);
  }

  const repoName = extractPartOfRepositoryURL(repositoryURL, "repository-name");
  if (repoName === null) {
    throw new Error(`Can not extract repository name from repository URL: ${repositoryURL}`);
  }

  const gitProvider = GitProviderNodeFactory.createGitProviderFromRepositoryURL(repositoryURL, httpFetch, configuration, configuration.inDocker);
  const { accessTokens } = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ScopeGroup.DeleteRepoControl]);
  const patAccessTokens = findPatAccessTokens(accessTokens);
  const errorStack: FetchResponse[] = [];
  for (const patAccessToken of patAccessTokens) {
    try {
      const fetchResponseForRemove = await gitProvider.removeRemoteRepository(patAccessToken.value, repositoryOwner, repoName);
      errorStack.push(fetchResponseForRemove);
      if (!(fetchResponseForRemove.status === 404 || (fetchResponseForRemove.status >= 200 && fetchResponseForRemove.status < 300))) {
        if (patAccessToken === patAccessTokens[patAccessTokens.length - 1]) {
          // If we are in last token then there are two possiblities for the failure
          if (fetchResponseForRemove.status === 403) {
            // We failed because we have no permissions then we throw the first error
            response.status(errorStack[0].status).json(await errorStack[0].json());
          }
          else {
            // Or we failed for other reason therefore the (possible) bot error message is more relevant
            response.status(fetchResponseForRemove.status).json(await fetchResponseForRemove.json());
          }
          return;
        }
        else {
          continue;
        }
      }
      // Else it is either already removed or we removed it now, then we can safely remove the url from the database, since either it no longer exists or we successfully removed it

      const irisToUpdate = await resourceModel.removeGitLinkFromResourceModel(repositoryURL);
      if (fetchResponseForRemove.status === 404) {
        // If it was already removed, then we just send back the 404 status after we removed the Git link from the database,
        //  since it no longer exists anyway.
        response.sendStatus(404);
        return;
      }

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
