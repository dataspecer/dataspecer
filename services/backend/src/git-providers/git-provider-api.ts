import { FetchResponse } from "@dataspecer/core/io/fetch/fetch-api";
import express from "express";
import { GitLabProvider } from "./git-provider-instances/gitlab.ts";
import { extractPartOfRepositoryURL } from "../utils/git-utils.ts";
import { GitHubProvider } from "./git-provider-instances/github.ts";

import fs from "fs";


export type GitCredentials = {
  name: string;
  email: string;
  accessToken: string;
};
// TODO RadStr: Always keep the webhook-test (respectively the part of url after /)

export const WEBHOOK_HANDLER_URL = "https://40a28f4bf886.ngrok-free.app/git/webhook-test";

export enum GitProviderEnum {
  GitHub,
  GitLab
}
/**
 * TODO RadStr: Maybe there is a better name?
 */
type WebhookRequestProviderSpecificData = {
  gitProvider: GitProvider;
  webhookPayload: object;
};
/**
 * TODO RadStr: Maybe there is a better name?
 * TODO RadStr: Also the repoName/iri might not be needed in future
 */

export type WebhookRequestDataProviderIndependent = {
  cloneURL: string;
  commits: object[];
  repoName: string;
  iri: string;
  branch: string;
};

export type CommitReferenceType = "commit" | "branch" | "tag";

export type RepositoryURLParts = CommitReferenceType | ("url-domain" | "repository-name" | "user-name");

export function isCommitReferenceType(value: string): value is CommitReferenceType {
  return value === "commit" || value === "branch" || value === "tag";
}

/**
 * Some git providers might change the URL based on the type of commit. For example Github - however Github also allows
 *  one uniform type of download url and it treats it like commit. Therefore If the {@link commitType} is not provided it will default to "commit".
 */
export function getDefaultCommitReferenceType(): CommitReferenceType {
  return "commit";
}

export type ExtractedCommitNameFromRepositoryURL = {
  commitName: string,
  fallbackToDefaultBranch: boolean,
};

export type createRemoteRepositoryReturnType = {
  defaultBranch: string | null,
  response: FetchResponse
}

export abstract class GitProviderFactory {
  static createGitProviderFromWebhookRequest(request: express.Request): WebhookRequestProviderSpecificData {
    // TODO RadStr: Debug print
    // console.info("Request body", request.body);
    if (request.body !== undefined && request.body.payload === undefined) {
      return {
        gitProvider: new GitLabProvider(),
        webhookPayload: request.body,
      };
    }
    else if (request?.body?.payload !== undefined) {
      return {
        gitProvider: new GitHubProvider(),
        webhookPayload: JSON.parse(request.body.payload),
      };
    }
    else {
      // TODO RadStr: Maybe better error handling
      throw new Error(`The given request from webhook is not of any known git provider. Request: ${request}`);
    }
  }

  /**
   * @param domainURL if not specified then the default one for the provider is used. for example in case of gitlab it is gitlab.com.
   *  So this domainURL needs to be provided only if we are using some specific provider - like gitlab.mff.cuni.cz
   * @returns
   */
  static createGitProvider(gitProviderName: GitProviderEnum, domainURL?: string): GitProvider {
    switch (gitProviderName) {
      case GitProviderEnum.GitHub:
        return new GitHubProvider();
      case GitProviderEnum.GitLab:
        return new GitLabProvider(domainURL);
      default:
        // TODO: Or maybe return default implementation, which does not do anything
        console.error(`${gitProviderName} does not exist. You forgot to extend GitProviderFactory`);
        throw new Error(`${gitProviderName} does not exist. You forgot to extend GitProviderFactory`);
    }
  }

  /**
   *
   * @param repositoryURL It is enough the for the repositoryURL to contain just the hostname part.
   */
  static createGitProviderFromRepositoryURL(repositoryURL: string): GitProvider {
    const gitProvider = getMainGitProviderFromRepositoryURL(repositoryURL);
    if (gitProvider === null) {
      // TODO: Better error handling
      throw new Error(`Git provider form given URL ${repositoryURL} does not exist.`);
    }
    const domainURL = extractPartOfRepositoryURL(repositoryURL, "url-domain") ?? undefined;
    return GitProviderFactory.createGitProvider(gitProvider, domainURL);
  }
}
// TODO: What about https://gitlab.mff.cuni.cz ???
/**
 * Maps the provider to the base URL domain.
 */

export const gitProviderDomains: Readonly<Record<GitProviderEnum, string>> = {
  [GitProviderEnum.GitHub]: "github.com",
  [GitProviderEnum.GitLab]: "gitlab.com",
};
/**
 * This expects known git provider, but I noticed that there are possibly more providers per one provider
 * @deprecated This works, but I noticed that there are more git providers within some spaces. For example there is only one GitHub
 *  but in case of gitlab, we can have self-hosted instances, for example our faculty uses https://gitlab.mff.cuni.cz,
 *  so there is not single gitlab URL for every organization.
 */

export const createGitRepositoryURLForKnownProviders = (gitProvider: GitProviderEnum, userName: string, repoName: string, branch?: string): string => {
  const baseURL = gitProviderDomains[gitProvider];
  const branchSuffix = branch === undefined ? "" : `/tree/${branch}`;
  const url = `https://${baseURL}/${userName}/${repoName}${branchSuffix}`;
  return url;
};

/**
 *
 * @param repositoryURL It is enough the for the repositoryURL to contain just the hostname part.
 * @returns the main provider of the repository, so for example if the URL looks like "https://gitlab.com/...", then main provider is gitlab,
 *  but also when it looks like "https://gitlab.my.org.com/..."
 */


export const getMainGitProviderFromRepositoryURL = (repositoryURL: string): GitProviderEnum | null => {
  const parsedUrl = new URL(repositoryURL);

  if (parsedUrl.hostname === "github.com") {
    return GitProviderEnum.GitHub;
  }
  else if (parsedUrl.hostname.startsWith("gitlab.")) {
    return GitProviderEnum.GitLab;
  }

  return null;
};
/**
 * @param repositoryURL is the URL of repository.
 * @returns The Git provider part of url, that is for example "github.com" or "gitlab.com" or "gitlab.my.org.com"
 */

export const getGitProviderURLPartFromRepositoryURL = (repositoryURL: string): string => {
  const parsedUrl = new URL(repositoryURL);
  return parsedUrl.hostname;
};

export interface GitProvider {
  /**
   * Returns the provider enum value for this provider.
   */
  getGitProviderEnumValue(): GitProviderEnum;

  /**
   * Returns the domain URL for this instance. For example for github is is "github.com". But for GitLab we can have different domains:
   *  "gitlab.com" or "gitlab.mff.cuni.cz". If {@link shouldPrefixWithHttps} is set to true, the domain will start with https://, otherwise not
   */
  getDomainURL(shouldPrefixWithHttps: boolean): string;

  /**
   * Sets the new domain URL for this instance. For example GitHub does nothing on this call. But for GitLab we can have different domains:
   *  "gitlab.com" or gitlab.mff.cuni.cz
   * @param newDomainURL is the new domain URL
   */
  setDomainURL(newDomainURL: string): void;

  /**
   *
   */
  /**
   * Extracts data for further processing from the {@link webhookPayload} of the webhook.
   * We have to separate it, because unfortunately each provider has slightly different format of the payload.
   * So we just pick the data we need and return them.
   * @param request is the original data from request as it came in webhook converted to JSON.
   * @returns Returns null if new branch was added to git, but the branch does not have equivalent in the DS.
   */
  extractDataForWebhookProcessing(webhookPayload: any): Promise<WebhookRequestDataProviderIndependent | null>;

  // TODO RadStr: Maybe everywhere use repository instead of repositoryUserName
  /**
   * Creates remote git repository with following URL .../{@link repositoryUserName}/{@link repoName}.
   * @param authToken has to contain right to create (public) repository
   * @param isUserRepo if true then we create repository under user of name {@link repositoryUserName},
   *  if false then we are creating repository under organization of name {@link repositoryUserName}.
   */
  createRemoteRepository(authToken: string, repositoryUserName: string, repoName: string, isUserRepo: boolean): Promise<createRemoteRepositoryReturnType>;

  /**
   * Removes remote git repository with following URL .../{@link repositoryUserName}/{@link repoName}.
   * @param authToken has to contain right to remove (public) repository
   */
  removeRemoteRepository(authToken: string, repositoryUserName: string, repoName: string): Promise<FetchResponse>;

  // TODO RadStr: Mozna vybrat jen podmnozinu a dat ji do enumu nebo nekam a pak vytvaret mapovani dle GitProvidera, ty requesty vypadaji ze ma kazdy jiny
  // TODO RadStr: ... asi jo
  /**
   * Creates webhook for repository with the following URL: .../{@link repositoryOwner}/{@link repositoryName}.
   *   The webhook works for given {@link webhookEvents} and is handled on the following {@link webhookHandlerURL}.
   * @param authToken Authorization token with access rights to create repository - for example OAuth token or PAT token
   * @param repositoryOwner is the repository owner - it is used to create the URL of the repository.
   * @param repositoryName is the repository name - it is used to create the URL of the repository.
   * @param webhookHandlerURL is the URL, which will handle the webhook events.
   * @param webhookEvents Names of the events to have webhooks for: For example - push, pull_request in case of GitHub.
   *  List of all available webhooks in GitHub: https://docs.github.com/en/webhooks/webhook-events-and-payloads
   *  For GitLab: https://docs.gitlab.com/user/project/integrations/webhook_events
   * @returns The response from the git provider
   */
  createWebhook(
    authToken: string,
    repositoryOwner: string,
    repositoryName: string,
    webhookHandlerURL: string,
    webhookEvents: string[]
  ): Promise<FetchResponse>;

  /**
   * Returns the bot credentials for the concrete git provider.
   */
  getBotCredentials(): GitCredentials;

  /**
   * Sets default bot for this git provider as a collaborator for given {@link}
   * @param repositoryUserName is the user part of the repository URL - Either name of the organization or of the user.
   * @param repoName is the name of the repository.
   */
  setBotAsCollaborator(repositoryUserName: string, repoName: string, accessToken: string): Promise<FetchResponse>;

  /**
   * Sets the repository secret for URL defined as urlRepoHost/{@link repositoryUserName}/{@link repoName}. Where urlRepoHost is for example github.com
   *  If the secret exists it is changed.
   */
  setRepositorySecret(repositoryUserName: string, repoName: string, accessToken: string, secretKey: string, secretValue: string): Promise<FetchResponse>;

  /**
   * Creates the publication repository. That is the repository to contain the generated artifacts and specifications.
   * This method does under the hood two important actions:
   *  1) Creates the publication repository.
   *  2) Sets bot as a collaborator. This is important, since the bot will be the one, which will push to the created publication repo.
   *     We have to do this, because the access tokens for the users are temporary, while this one is "permanent" (we can from time to time generate new one and set environment variables with it).
   *  3) Enable GitHub pages (or some other equivalent for different git providers)
   *
   * @param repoName is the name of the repository, which contains publications
   * @param isUserRepo if true then it is repo created under user, if false it is created under organization
   * @param repositoryUserName is the name of the organization if {@link isUserRepo} is false, or name of user if it is true.
   *  If not provided then bot is used as a user and the {@link isUserRepo} is ignored (it is expected to be true).
   * @param accessToken if not given, the bot access token is used.
   */
  createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryUserName?: string, accessToken?: string): Promise<FetchResponse>;

  /**
   * Copies (or rather create file links, but the end effect is same, we just safe space and actions on hard drive)
   *  the workflow files (that is for example in case of GitHub the GitHub actions) to the {@link targetPackageIRI}.
   *  Note that it is package, since the full path is based on both the {@link targetPackageIRI} and the gitProvider.
   */
  copyWorkflowFiles(targetPackageIRI: string): void;

  /**
   * @returns True if the given {@link fullpath} is path to directory containing the git provider specific files (like workflow files). False otherwise.
   */
  isGitProviderDirectory(fullPath: string): boolean;

  /**
   * @returns For given {@link repositoryURL} returns the default branch.
   *  Either the branch is present in side the {@link repositoryURL}, if not it is queried through REST API request.
   */
  getDefaultBranch(repositoryURL: string): Promise<string>;

  /**
   * Note that this method has default implementation in {@link GitProviderBase}.
   * @returns Returns the name of the commit hidden inside {@link repoURL} and if the commit is not specified it returns the name of the default branch
   *  (which can be found by querying the REST endpoint for the repository, at least in github case). and the {@link fallbackToDefaultBranch} is set to true in such case.
   */
  getCommitNameFromRepositoryURL(repoURL: string, commitType: CommitReferenceType): Promise<ExtractedCommitNameFromRepositoryURL>;

  /**
   * Note that this method has default implementation in {@link GitProviderBase}.
   * @param repositoryURL is the URL of the repository
   * @returns The part of given URL. Where the given URL can either be the main page
   *  (for example https://github.com/mff-uk/dataspecer) or some of the branches (for example https://github.com/mff-uk/dataspecer/tree/stable).
   *  Should also work for gitlab or any other git providers following similar URL structure.
   *  In the example mff-uk is "user-name" and dataspecer is "repository-name".
   *  For "branch" returns null, if it not explicitly provided in the {@link repositoryURL}.
   */
  extractPartOfRepositoryURL(repositoryURL: string, part: RepositoryURLParts): string | null;

  /**
   * Converts given {@link repositoryURL} to zip download link. Note that this method is implemented in {@link GitProviderBase}.
   * @param repositoryURL is the link to the repository. The method supports commit specific links. That is the {@link commitType} links.
   *  Note that if you don't know you should use the {@link getDefaultCommitReferenceType}. Then it treats it as link to commit.
   *  If the commit hash is not inside the link, it defaults into main branch.
   * @returns The link to download repostitory as a zip.
   */
  convertRepoURLToDownloadZipURL(repositoryURL: string, commitType: CommitReferenceType): Promise<string>;

  /**
   * @returns The URL, which looks like {@link gitProviderURL}/{@link userName}/{@link repoName}/tree/{@link branch} for github, for other provides it might look different.
   *  Where the last part tree/... is only when branch is defined, otherwise it is not in result (which means we are returning main branch).
   */
  createGitRepositoryURL(userName: string, repoName: string, branch?: string): string;

  /**
   * @returns Converts the {@link repositoryUrl}, which may possible point to commit or branch to the url, which is the homepage of the repository. For example https://github.com/dataspecer/dataspecer
   */
  extractDefaultRepositoryUrl(repositoryUrl: string): string;
}


/**
 * Recursively creates links using fs.link. From {@link sourceDirectory} to {@link targetDirectory}
 */
export function createLinksForFiles(sourceDirectory: string, targetDirectory: string): void {
  const files = fs.readdirSync(sourceDirectory);
  for (const file of files) {
    const newSourcefullPath = `${sourceDirectory}/${file}`;
    const newTargetFullPath = `${targetDirectory}/${file}`;
    const stats = fs.statSync(newSourcefullPath);
    if (stats.isDirectory()) {
      createLinksForFiles(newSourcefullPath, newTargetFullPath);
    }
    else {
      fs.link(newSourcefullPath, newTargetFullPath, (err) => { console.info("err", err); });
    }
  }
}
