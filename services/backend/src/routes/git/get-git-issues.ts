import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { GitProvider, IssueState } from "@dataspecer/git";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { getGitCredentialsFromSession } from "../../authentication/auth-session.ts";
import { GitProviderFactory } from "@dataspecer/git/git-providers";
import { ScopeGroup } from "@dataspecer/auth";

/**
 * Returns the issues for given Git repository URL.
 */
export const getGitIssues = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    gitUrl: z.string().min(1),
    issueState: z.nativeEnum(IssueState),
    page: z.string().min(1),
    perPage: z.string().min(1),
  });

  const query = querySchema.parse(request.query);
  const { gitUrl, issueState } = query;
  const page = Number(query.page);
  const perPage = Number(query.perPage);

  const gitProvider: GitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(gitUrl, httpFetch, configuration);
  const { committerAccessToken } = getGitCredentialsFromSession(request, response, [ScopeGroup.LoginInfo, ScopeGroup.FullPublicRepoControl, ScopeGroup.DeleteRepoControl]);
  const issues = await gitProvider.getIssues(gitUrl, issueState, page, perPage, committerAccessToken);
  response.status(200).json(issues);
});
