import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { ConfigType, convertGitProviderNameToEnum, GitProvider, GitProviderEnum, isGitProviderName, UserOrganizationsFetchResponse } from "@dataspecer/git";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { getGitCredentialsFromSession, getGitProviderEnumFromSession } from "../../authentication/auth-session.ts";
import { GitProviderFactory } from "@dataspecer/git/git-providers";
import { z } from "zod";

/**
 * Returns the for which is the user member of. If the user is not signed in returns error, if they are signed in, but with different git provider, then returns empty array
 */
export const getAuthenticatedUserOrganizations = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    targetGitProvider: z.string().min(1),
  });
  const { targetGitProvider } = querySchema.parse(request.query);
  if (!isGitProviderName(targetGitProvider)) {
    response.status(401).json({error: `Unknown given Git provider: ${targetGitProvider}`});
    return;
  }

  const gitProviderEnum: GitProviderEnum | null = getGitProviderEnumFromSession(response);
  if (gitProviderEnum === null) {
    response.status(401).json({error: `The user is not signed in.`});
    return;
  }
  if (convertGitProviderNameToEnum(targetGitProvider) !== gitProviderEnum) {
    const emptyResponse: UserOrganizationsFetchResponse = {
      organizations: [],
      isLastPage: true,
    };
    response.status(200).json(emptyResponse);
    return;
  }

  const gitProvider: GitProvider = GitProviderFactory.createGitProvider(gitProviderEnum, httpFetch, configuration);
  const credentials = getGitCredentialsFromSession(request, response, [ConfigType.LoginInfo, ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl]);
  const organizations = await gitProvider.getOrganizationsForAuthenticatedUser(credentials.committerAccessToken);
  response.status(200).json(organizations);
});
