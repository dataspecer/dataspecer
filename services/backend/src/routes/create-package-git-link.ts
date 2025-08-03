import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { resourceModel } from "../main.ts";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { extractPartOfRepositoryURL } from "../git-providers/git-provider-instances/gitlab.ts";
import { createGitRepositoryURL, GitProviderFactory, WEBHOOK_HANDLER_URL } from "../git-providers/git-provider-api.ts";
import { commitPackageToGitUsingAuthSession } from "./commit-package-to-git.ts";
import { transformCommitMessageIfEmpty } from "../utils/git-utils.ts";
import { getGitCredentialsFromSessionWithDefaults } from "../authorization/auth-session.ts";
import { ConfigType } from "../authorization/auth-config.ts";



//////////////////////////////////
//////////////////////////////////
// TODO: Based on exportPackageResource, just to have proof-of-concept
//////////////////////////////////
//////////////////////////////////

function getName(name: LanguageString | undefined, defaultName: string) {
  return name?.["cs"] || name?.["en"] || defaultName;
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
  });

  const query = querySchema.parse(request.query);

  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(query.gitProviderURL);
  const { name: sessionUserName, accessToken } = getGitCredentialsFromSessionWithDefaults(gitProvider, response, [ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl]);
  const repositoryUserName = query.givenUserName.length === 0 ? sessionUserName : query.givenUserName;

  const commitMessage = transformCommitMessageIfEmpty(query.commitMessage);
  const repoName = query.givenRepositoryName;


  console.info("TODO RadStr: STARTING");
  const fullLinkedGitRepositoryURL = createGitRepositoryURL(query.gitProviderURL, repositoryUserName, repoName);
  console.info("gitProvider", gitProvider, fullLinkedGitRepositoryURL);

  const isUserRepo = repositoryUserName === sessionUserName;
  const createRemoteRepositoryResult = await gitProvider.createRemoteRepository(accessToken, repositoryUserName, repoName, isUserRepo);
  // TODO RadStr: Debug print ... for some reason there is max 10 repositories limit on school gitlab (idk if it is for creations a day or something)
  // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token)
  // console.info({createRemoteRepositoryResult});

  const createPublicationRepositoryResult = await gitProvider.createPublicationRepository(repoName + "-publication-repo", isUserRepo, repositoryUserName, accessToken);

  // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token)
  // console.info({createPublicationRepositoryResult});
  const setRepositorySecretResult = gitProvider.setRepositorySecret(repositoryUserName, repoName, accessToken, "BOT_PAT_TOKEN", gitProvider.getBotCredentials().accessToken);

  // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token)
  // console.info({setRepositorySecretResult});

  await gitProvider.createWebhook(accessToken, repositoryUserName, repoName, WEBHOOK_HANDLER_URL, ["push"]);

  commitPackageToGitUsingAuthSession(query.iri, fullLinkedGitRepositoryURL, repositoryUserName, repoName, commitMessage, response);
  resourceModel.updateResourceGitLink(query.iri, fullLinkedGitRepositoryURL);

  response.sendStatus(200);
});


// TODO: This one I am not sure if it is working yet - also I should create new thing in database or at least set the gitRepositoryLink on it
//       ... Honestly I don't know:
//                                  - I should create new one since what do I gain by having two of same packages in DS, but we are linked to git repo, so the updates will cause insane conflicts (unless of course we will be in different branches)
//                                  - I link it to the old one - sure I wont get conflicts, but what is the point? I have two same packages in DS - I feel like this is only useful once we use branch swapping
/**
 * Creates new Dataspecer package, which is linked to already existing Git repository.
 *  Which technically means that new webhook is added to the repository
 */
export const createPackageFromExistingGitRepository = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    gitRepositoryURL: z.string().min(1),
    commitMessage: z.string(),
  });

  const query = querySchema.parse(request.query);

  const commitMessage = transformCommitMessageIfEmpty(query.commitMessage);
  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(query.gitRepositoryURL);
  const repoName = extractPartOfRepositoryURL(query.gitRepositoryURL, "repository-name");
  const repositoryUserName = extractPartOfRepositoryURL(query.gitRepositoryURL, "user-name");
  if (repoName === null) {
    // TODO RadStr: Better error handling
    console.error("Repository name could not be extracted from the repository URL");
    return;
  }
  if (repositoryUserName === null) {
    // TODO RadStr: Better error handling
    console.error("User name could not be extracted from the repository URL");
    return;
  }
  // TODO: Maybe also provide variant which takes the full URL, since above I am splitting it for no reason
  const { accessToken } = getGitCredentialsFromSessionWithDefaults(gitProvider, response, [ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl]);
  await gitProvider.createWebhook(accessToken, repositoryUserName, repoName, WEBHOOK_HANDLER_URL, ["push"]);

  commitPackageToGitUsingAuthSession(query.iri, query.gitRepositoryURL, repositoryUserName, repoName, commitMessage, response);
});

export async function getRepositoryNameFromDatabase(linkedPackageIri: string): Promise<string | null> {
  const resource = await resourceModel.getResource(linkedPackageIri);
  if (resource === null) {
    // TODO: Better error handling
    console.error(`Package with given iri: ${linkedPackageIri} does not exist.`);
    return null;
  }

  return extractPartOfRepositoryURL(resource.linkedGitRepositoryURL, "repository-name");
}
