import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { ScopeGroup, GitProvider, IssueState } from "@dataspecer/git";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { getGitCredentialsFromSession } from "../../authentication/auth-session.ts";
import { GitProviderFactory } from "@dataspecer/git/git-providers";

/**
 * Returns the total issue count for given Git repository URL.
 */
export const getGitIssueTotalCount = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    gitUrl: z.string().min(1),
    issueState: z.nativeEnum(IssueState),
  });

  const query = querySchema.parse(request.query);
  const { gitUrl, issueState } = query;

  const gitProvider: GitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(gitUrl, httpFetch, configuration);
  const { committerAccessToken } = getGitCredentialsFromSession(request, response, [ScopeGroup.LoginInfo, ScopeGroup.FullPublicRepoControl, ScopeGroup.DeleteRepoControl]);
  const issueCount = await gitProvider.getTotalIssueCount(gitUrl, issueState, committerAccessToken);
  response.status(200).json(issueCount);
});
