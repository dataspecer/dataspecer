import { extractPartOfRepositoryURL, GitProviderEnum, GitProviderNode } from "@dataspecer/git";
import fs from "fs";
import { GitHubNodeProvider } from "./git-provider-instances/github-node.ts";
import { GitLabNodeProvider } from "./git-provider-instances/gitlab-node.ts";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { AuthenticationGitProvidersData, ExpressRequestForGitProviderFactory, getMainGitProviderFromRepositoryURL } from "@dataspecer/git/git-providers";


type WebhookDataAndGitProvider = {
  gitProvider: GitProviderNode;
  webhookPayload: object;
};

export abstract class GitProviderNodeFactory {
  static createGitProviderFromWebhookRequest(
    request: ExpressRequestForGitProviderFactory,
    httpFetch: HttpFetch,
    authenticationGitProvidersData: AuthenticationGitProvidersData
  ): WebhookDataAndGitProvider {
    if (request.body !== undefined && request.body.payload === undefined) {
      return {
        gitProvider: new GitLabNodeProvider(httpFetch, authenticationGitProvidersData),
        webhookPayload: request.body,
      };
    }
    else if (request?.body?.payload !== undefined) {
      return {
        gitProvider: new GitHubNodeProvider(httpFetch, authenticationGitProvidersData),
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
  ): GitProviderNode {
    switch (gitProviderName) {
      case GitProviderEnum.GitHub:
        return new GitHubNodeProvider(httpFetch, authenticationGitProvidersData);
      case GitProviderEnum.GitLab:
        return new GitLabNodeProvider(httpFetch, authenticationGitProvidersData, domainURL);
      default:
        // TODO: Or maybe return default implementation, which does not do anything
        console.error(`${gitProviderName} does not exist. You forgot to extend GitProviderNodeFactory`);
        throw new Error(`${gitProviderName} does not exist. You forgot to extend GitProviderNodeFactory`);
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
  ): GitProviderNode {
    const gitProvider = getMainGitProviderFromRepositoryURL(repositoryURL);
    if (gitProvider === null) {
      throw new Error(`Git provider with given URL ${repositoryURL} does not exist.`);
    }
    const domainURL = extractPartOfRepositoryURL(repositoryURL, "url-domain") ?? undefined;
    return GitProviderNodeFactory.createGitProvider(gitProvider, httpFetch, authenticationGitProvidersData, domainURL);
  }
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
