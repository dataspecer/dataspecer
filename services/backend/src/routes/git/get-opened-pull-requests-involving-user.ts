import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { ConfigType, convertGitProviderNameToEnum, GitProvider } from "@dataspecer/git";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { getGitCredentialsFromSession, getStoredSession } from "../../authentication/auth-session.ts";
import { GitProviderFactory } from "@dataspecer/git/git-providers";

/**
 * Returns the opened pull requests which are in any way involving the signed in user.
 *   The implementation sends queries to the Git provider using (at least now) REST API and returns the response in changed format.
 * @todo This works only for the Git provider that you used for signing in.
 *  (In future it might be possible (once we introduce database) to have one DS account which is linked to many OAuth providers - GitHub, GitLab, ...
 */
export const getOpenedPullRequestsInvolvingUser = asyncHandler(async (request: express.Request, response: express.Response) => {
  const session = getStoredSession(response);
  const gitProviderName = (session?.user as any)?.accountProvider;
  if (gitProviderName === undefined) {
    response.status(401);
    return;
  }

  const gitProviderEnum = convertGitProviderNameToEnum(gitProviderName);
  if (gitProviderEnum === undefined) {
    response.status(401);
    return;
  }

  const gitProvider: GitProvider = GitProviderFactory.createGitProvider(gitProviderEnum, httpFetch, configuration);
  const credentials = getGitCredentialsFromSession(request, response, [ConfigType.LoginInfo, ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl]);
  const openedPullRequests = await gitProvider.getOpenedPullRequestsInvolvingUser(credentials.committerAccessToken);
  response.status(200).json(openedPullRequests);
});
