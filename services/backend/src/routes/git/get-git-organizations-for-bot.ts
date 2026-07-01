import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { convertGitProviderNameToEnum, GitProvider, isGitProviderName } from "@dataspecer/git";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { GitProviderFactory } from "@dataspecer/git/git-providers";
import { z } from "zod";

/**
 *  Returns the for which is the bot member of. If the bot does not exist, returns empty array in the response.
 */
export const getBotOrganizations = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    targetGitProvider: z.string().min(1),
  });
  const { targetGitProvider } = querySchema.parse(request.query);

  if (!isGitProviderName(targetGitProvider)) {
    response.status(401).json({error: `Unknown given Git provider: ${targetGitProvider}`});
    return;
  }

  const targetGitProviderName = convertGitProviderNameToEnum(targetGitProvider);
  if (targetGitProviderName === undefined) {
    response.status(401).json({error: `Unknown given Git provider: ${targetGitProvider}`});
    return;
  }

  const gitProvider: GitProvider = GitProviderFactory.createGitProvider(targetGitProviderName, httpFetch, configuration);
  const organizations = await gitProvider.getOrganizationsForAuthenticatedUser(null);
  response.status(200).json(organizations);
});
