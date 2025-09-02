import { GitProvider, GitProviderEnum } from "@dataspecer/git";
import express from "express";
import fs from "fs";
import { extractPartOfRepositoryURL } from "../utils/git-utils.ts";
import { GitHubProvider } from "./git-provider-instances/github.ts";
import { GitLabProvider } from "./git-provider-instances/gitlab.ts";


/**
 * TODO RadStr: Maybe there is a better name?
 */
type WebhookRequestProviderSpecificData = {
  gitProvider: GitProvider;
  webhookPayload: object;
};

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
