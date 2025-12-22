import { extractPartOfRepositoryURL, GitProvider, GitProviderEnum, GitProviderNamesAsType } from "@dataspecer/git";
import express from "express";
import fs from "fs";
import { GitHubProvider } from "./git-provider-instances/github.ts";
import { GitLabProvider } from "./git-provider-instances/gitlab.ts";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { GitBotConfiguration, OAuthConfiguration } from "@dataspecer/git/auth";

export type AuthenticationGitProvidersData = {
  gitBotConfigurations?: Record<GitProviderNamesAsType, GitBotConfiguration>;
  authConfiguration?: OAuthConfiguration;
};

/**
 * TODO RadStr: Maybe there is a better name?
 */
type WebhookRequestProviderSpecificData = {
  gitProvider: GitProvider;
  webhookPayload: object;
};

export abstract class GitProviderFactory {
  static createGitProviderFromWebhookRequest(
    request: express.Request,
    httpFetch: HttpFetch,
    authenticationGitProvidersData: AuthenticationGitProvidersData
  ): WebhookRequestProviderSpecificData {
    if (request.body !== undefined && request.body.payload === undefined) {
      return {
        gitProvider: new GitLabProvider(httpFetch, authenticationGitProvidersData),
        webhookPayload: request.body,
      };
    }
    else if (request?.body?.payload !== undefined) {
      return {
        gitProvider: new GitHubProvider(httpFetch, authenticationGitProvidersData),
        webhookPayload: JSON.parse(request.body.payload),
      };
    }
    else {
      throw new Error(`The given request from webhook is not of any known git provider. Request: ${request}`);
    }
  }

  /**
   * @param domainURL if not specified then the default one for the provider is used. for example in case of gitlab it is gitlab.com.
   *  So this domainURL needs to be provided only if we are using some specific provider - like gitlab.mff.cuni.cz
   * @returns
   */
  static createGitProvider(
    gitProviderName: GitProviderEnum,
    httpFetch: HttpFetch,
    authenticationGitProvidersData: AuthenticationGitProvidersData,
    domainURL?: string
  ): GitProvider {
    switch (gitProviderName) {
      case GitProviderEnum.GitHub:
        return new GitHubProvider(httpFetch, authenticationGitProvidersData);
      case GitProviderEnum.GitLab:
        return new GitLabProvider(httpFetch, authenticationGitProvidersData, domainURL);
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
  static createGitProviderFromRepositoryURL(
    repositoryURL: string,
    httpFetch: HttpFetch,
    authenticationGitProvidersData: AuthenticationGitProvidersData
  ): GitProvider {
    const gitProvider = getMainGitProviderFromRepositoryURL(repositoryURL);
    if (gitProvider === null) {
      throw new Error(`Git provider with given URL ${repositoryURL} does not exist.`);
    }
    const domainURL = extractPartOfRepositoryURL(repositoryURL, "url-domain") ?? undefined;
    return GitProviderFactory.createGitProvider(gitProvider, httpFetch, authenticationGitProvidersData, domainURL);
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

const sshURLPrefix = "git@";
/**
 *
 * @param repositoryURL It is enough the for the repositoryURL to contain just the hostname part. Can also be "ssh url" (for example git@github.com:dataspecer/dataspecer.git)
 * @returns the main provider of the repository, so for example if the URL looks like "https://gitlab.com/...", then main provider is gitlab,
 *  but also when it looks like "https://gitlab.my.org.com/..."
 */
export const getMainGitProviderFromRepositoryURL = (repositoryURL: string): GitProviderEnum | null => {
  let stringToCheckForProvider: string;
  if (repositoryURL.startsWith(sshURLPrefix)) {
    stringToCheckForProvider = repositoryURL.substring(sshURLPrefix.length);
  }
  else {
    const parsedUrl = new URL(repositoryURL);
    stringToCheckForProvider = parsedUrl.hostname;
  }


  if (stringToCheckForProvider.startsWith("github.com")) {
    return GitProviderEnum.GitHub;
  }
  else if (stringToCheckForProvider.startsWith("gitlab.")) {
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
      fs.link(newSourcefullPath, newTargetFullPath, (error) => {
        // TODO: We check for both values, but probably code or just errno should be sufficient
        if (error?.code === "EXDEV" && error?.errno === -18) {
          // We try to copy on failure. This for example happens in Docker, sicne they are on different devices (filesystems).
          // TODO: Maybe put into the database directory instead and then the link should probably work.
          fs.copyFileSync(newSourcefullPath, newTargetFullPath);
        }
      });
    }
  }
}
