import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { ConfigType, GitProvider } from "@dataspecer/git";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { getGitCredentialsFromSession } from "../../authentication/auth-session.ts";
import { GitProviderFactory } from "@dataspecer/git/git-providers";

/**
 * Returns the opened pull requests, where one end is the given branch.
 * The implementation sends queries to the Git provider and returns the response in changed format.
 */
export const getOpenedPullRequestsForBranch = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    gitUrl: z.string().min(1),
    branch: z.string().min(1),
    page: z.string().min(1),
    perPage: z.string().min(1),
  });

  const query = querySchema.parse(request.query);
  const { gitUrl, branch } = query;
  const page = Number(query.page);
  const perPage = Number(query.perPage);

  const gitProvider: GitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(gitUrl, httpFetch, configuration);
  const { committerAccessToken } = getGitCredentialsFromSession(request, response, [ConfigType.LoginInfo, ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl])
  const openedPullRequests = await gitProvider.getOpenedPullRequestsForBranch(gitUrl, branch, page, perPage, committerAccessToken);
  response.status(200).json(openedPullRequests);
});
