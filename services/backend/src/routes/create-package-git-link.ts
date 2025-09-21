import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { resourceModel } from "../main.ts";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { checkErrorBoundaryForCommitAction, extractPartOfRepositoryURL, stringToBoolean } from "../utils/git-utils.ts";
import { AccessToken, AccessTokenType, ConfigType, convertToValidGitName, WEBHOOK_HANDLER_URL } from "@dataspecer/git";
import { GitProviderFactory } from "../git-providers/git-provider-factory.ts";
import { commitPackageToGitUsingAuthSession } from "./commit-package-to-git.ts";
import { transformCommitMessageIfEmpty } from "../utils/git-utils.ts";
import { getGitCredentialsFromSessionWithDefaults } from "../authorization/auth-session.ts";


export function findPatAccessToken(accessTokens: AccessToken[] | null | undefined): AccessToken | null {
  const accessToken = accessTokens?.find(token => token.type === AccessTokenType.PAT);
  return accessToken ?? null;
}

export function findPatAccessTokens(accessTokens: AccessToken[] | null | undefined): AccessToken[] {
  const patAccessToken = accessTokens?.filter(token => token.type === AccessTokenType.PAT);
  return patAccessToken ?? [];
}

/**
 * Creates GitHub repo with content equal to the package with given iri inside the query part of express http request.
 */
export const createLinkBetweenPackageAndGit = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    givenUserName: z.string(),
    givenRepositoryName: z.string().min(1),
    gitProviderURL: z.string().min(1),
    commitMessage: z.string(),
    isUserRepo: z.string().min(1),
    exportFormat: z.string().min(1).optional(),
  });

  const query = querySchema.parse(request.query);

  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(query.gitProviderURL);
  const { name: sessionUserName, accessTokens } = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl]);
  const patAccessTokens = findPatAccessTokens(accessTokens);
  // Either the user has create repo access AND it has access to the "user", then we are good
  // Or it has create repo access, but does not have access to the "user". Then we have two possibilities
  //  either we fail, or we will try the bot token to create the repositories. To me the second one makes more sense. So that is the implemented variant.
  for (const patAccessToken of patAccessTokens) {
    try {
      const repositoryUserName = convertToValidGitName(query.givenUserName.length === 0 ? sessionUserName : query.givenUserName);
      const commitMessage = transformCommitMessageIfEmpty(query.commitMessage);
      const repoName = convertToValidGitName(query.givenRepositoryName);
      const fullLinkedGitRepositoryURL = gitProvider.createGitRepositoryURL(repositoryUserName, repoName);

      const isUserRepo = stringToBoolean(query.isUserRepo);
      if (isUserRepo) {
        // If it is user repo then the owner of the pat access token have to be the user of the user part of repository url
        // In other words if it is bot token then the repositoryUserName has to be bot name
        if (patAccessToken.isBotAccessToken && repositoryUserName !== gitProvider.getBotCredentials()?.name) {
          continue;
        }
      }

      const { defaultBranch } = await gitProvider.createRemoteRepository(patAccessToken.value, repositoryUserName, repoName, isUserRepo);
      const createPublicationRepositoryResult = await gitProvider.createPublicationRepository(repoName + "-publication-repo", isUserRepo, repositoryUserName, patAccessToken.value);

      const botAccessToken = findPatAccessToken(gitProvider.getBotCredentials()?.accessTokens);
      if (botAccessToken === null) {
        // TODO RadStr: Somehow give this text to user so he knwos that he has to set the pat token to the repo so we can push to publish repo
        console.error("The bot has not defined access token");
      }
      else {
        const setRepositorySecretResult = await gitProvider.setRepositorySecret(repositoryUserName, repoName, patAccessToken.value, "BOT_PAT_TOKEN", botAccessToken.value);
      }


      await gitProvider.createWebhook(patAccessToken.value, repositoryUserName, repoName, WEBHOOK_HANDLER_URL, ["push"]);
      await resourceModel.updateResourceProjectIriAndBranch(query.iri, undefined, defaultBranch ?? undefined);
      await resourceModel.updateResourceGitLink(query.iri, fullLinkedGitRepositoryURL, true);

      // // Just provide empty merge from values, since we are newly creating the link we can not perform merge right away anyways
      const commitResult = await commitPackageToGitUsingAuthSession(
        request, query.iri, fullLinkedGitRepositoryURL, defaultBranch, "", "", "",
        repositoryUserName, repoName, commitMessage, response, query.exportFormat ?? null);

      if (!commitResult) {
        response.sendStatus(409);
        return;
      }

      response.sendStatus(200);
      return;
    }
    catch {
      // EMPTY, we just want to try another iteration, don't care about errors
    }
  }

  throw new Error("There is neither user or bot pat token to perform operations needed to create the link. For example creating remote repo");
});


// TODO: This one I am not sure if it is working yet - also I should create new thing in database or at least set the gitRepositoryLink on it
//       ... Honestly I don't know:
//                                  - I should create new one since what do I gain by having two of same packages in DS, but we are linked to git repo, so the updates will cause insane conflicts (unless of course we will be in different branches)
//                                  - I link it to the old one - sure I wont get conflicts, but what is the point? I have two same packages in DS - I feel like this is only useful once we use branch swapping
/**
 * Creates new Dataspecer package, which is linked to already existing Git repository.
 *  Which technically means that new webhook is added to the repository
 * @deprecated Maybe deprecated? I don't call the endpoint from frontend
 */
export const createPackageFromExistingGitRepository = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    gitRepositoryURL: z.string().min(1),
    commitMessage: z.string(),
    exportFormat: z.string().min(1).optional(),
  });

  const query = querySchema.parse(request.query);

  const commitMessage = transformCommitMessageIfEmpty(query.commitMessage);
  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(query.gitRepositoryURL);
  const repoName = gitProvider.extractPartOfRepositoryURL(query.gitRepositoryURL, "repository-name");
  const repositoryUserName = gitProvider.extractPartOfRepositoryURL(query.gitRepositoryURL, "user-name");
  const branchName = gitProvider.extractPartOfRepositoryURL(query.gitRepositoryURL, "branch");

  checkErrorBoundaryForCommitAction(query.gitRepositoryURL, repoName, repositoryUserName);

  const { accessTokens } = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl]);
  const accessToken = findPatAccessToken(accessTokens);
  if (accessToken === null) {
    throw new Error("There is neither user or bot pat token to perform operations needed to create the link. For example creating remote repo");
  }
  await gitProvider.createWebhook(accessToken.value, repositoryUserName!, repoName!, WEBHOOK_HANDLER_URL, ["push"]);

  // Just provide empty merge from values, since we are newly creating the link we can not perform merge right away anyways
  await commitPackageToGitUsingAuthSession(
    request, query.iri, query.gitRepositoryURL, branchName, "", "", "", repositoryUserName!,
    repoName!, commitMessage, response, query.exportFormat ?? null);
});

/**
 * TODO RadStr After: Not used
 */
async function getRepositoryNameFromDatabase(linkedPackageIri: string): Promise<string | null> {
  const resource = await resourceModel.getResource(linkedPackageIri);
  if (resource === null) {
    throw new Error(`Package with given iri: ${linkedPackageIri} does not exist.`);
  }

  return extractPartOfRepositoryURL(resource.linkedGitRepositoryURL, "repository-name");
}
