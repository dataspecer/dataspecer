import { z } from "zod";
import { ConfigType } from "../authorization/auth-config.ts";
import { getGitCredentialsFromSessionWithDefaults } from "../authorization/auth-session.ts";
import { extractPartOfRepositoryURL } from "../git-providers/git-provider-instances/gitlab.ts";
import { GitProviderFactory } from "../git-providers/git-provider-api.ts";
import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";

import express from "express";

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
    // TODO: Better error handling
    console.error("Repository URL is undefined");   // TODO: I think that this happens because of the resource missing rather than URL
    return;
  }

  const repositoryUserName = extractPartOfRepositoryURL(repositoryURL, "user-name");
  if (repositoryUserName === null) {
    // TODO: Better error handling
    console.error("Can not extract user name from repository URL", repositoryURL);
    return;
  }

  const repoName = extractPartOfRepositoryURL(repositoryURL, "repository-name");
  if (repoName === null) {
    // TODO: Better error handling
    console.error("Can not extract repository name from repository URL", repositoryURL);
    return;
  }

  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(repositoryURL);
  const { accessToken } = getGitCredentialsFromSessionWithDefaults(gitProvider, response, [ConfigType.DeleteRepoControl]);


  // TODO RadStr: Again - I have the full URL, I don't need to deconstruct it and then construct it back
  const fetchResponseForRemove = await gitProvider.removeRemoteRepository(accessToken, repositoryUserName, repoName);
  // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token)
  // console.info("fetchResponse for GitHub repository delete", fetchResponseForRemove);

  // TODO RadStr: Well the name of repository might be different in future, but this is anyways just for debugging now
  const fetchResponseForPublicationRepositoryRemove = await gitProvider.removeRemoteRepository(accessToken, repositoryUserName, repoName + "-publication-repo");
  // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token)
  // console.info("fetchResponse for GitHub repository delete", fetchResponseForPublicationRepositoryRemove);

  // TODO: Should only remove on success
  console.info("Git link before removal:", (await resourceModel.getResource(query.iri))?.linkedGitRepositoryURL);
  await resourceModel.updateResourceGitLink(query.iri, "{}");
  console.info("Git link after removal:", (await resourceModel.getResource(query.iri))?.linkedGitRepositoryURL);
});
