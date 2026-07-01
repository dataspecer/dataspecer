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
    authenticationGitProvidersData: AuthenticationGitProvidersData,
    isRunningInDocker: boolean,
  ): WebhookDataAndGitProvider {
    if (request.body !== undefined && request.body.payload === undefined) {
      return {
        gitProvider: new GitLabNodeProvider(httpFetch, authenticationGitProvidersData, isRunningInDocker),
        webhookPayload: request.body,
      };
    }
    else if (request?.body?.payload !== undefined) {
      return {
        gitProvider: new GitHubNodeProvider(httpFetch, authenticationGitProvidersData, isRunningInDocker),
        webhookPayload: JSON.parse(request.body.payload),
      };
    }
    else {
      throw new Error(`The given request from webhook is not of any known Git provider. Request: ${request}`);
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
    isRunningInDocker: boolean,
    domainURL?: string
  ): GitProviderNode {
    switch (gitProviderName) {
      case GitProviderEnum.GitHub:
        return new GitHubNodeProvider(httpFetch, authenticationGitProvidersData, isRunningInDocker);
      case GitProviderEnum.GitLab:
        return new GitLabNodeProvider(httpFetch, authenticationGitProvidersData, isRunningInDocker, domainURL);
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
    authenticationGitProvidersData: AuthenticationGitProvidersData,
    isRunningInDocker: boolean,
  ): GitProviderNode {
    const gitProvider = getMainGitProviderFromRepositoryURL(repositoryURL);
    if (gitProvider === null) {
      throw new Error(`Git provider with given URL ${repositoryURL} does not exist.`);
    }
    const domainURL = extractPartOfRepositoryURL(repositoryURL, "url-domain") ?? undefined;
    return GitProviderNodeFactory.createGitProvider(gitProvider, httpFetch, authenticationGitProvidersData, isRunningInDocker, domainURL);
  }
}

/**
 * Recursively creates links using fs.link. From {@link sourceDirectory} to {@link targetDirectory}.
 */
export function createLinksForFiles(sourceDirectory: string, targetDirectory: string): void {
  const files = fs.readdirSync(sourceDirectory);
  for (const file of files) {
    const fullPathToSource = `${sourceDirectory}/${file}`;
    const fullPathToTarget = `${targetDirectory}/${file}`;
    const stats = fs.statSync(fullPathToSource);
    if (stats.isDirectory()) {
      createLinksForFiles(fullPathToSource, fullPathToTarget);
    }
    else {
      try {
        fs.linkSync(fullPathToSource, fullPathToTarget);
      }
      catch (error: any) {
        if (error?.code === "EXDEV") {
          // We try to copy on failure. This for example happens in Docker for workflow files copying IF they are not in the database directory,
          //  since then they are on different devices (filesystems). However, in case of the Docker we do have them in the database directory, so it is no longer an issue.
          //  Therefore, if it happens now there is a different reason for it.
          fs.copyFileSync(fullPathToSource, fullPathToTarget);
        }
        else {
          // TODO RadStr: Either try copy or throw error, cannot currently tell what is better.
          fs.copyFileSync(fullPathToSource, fullPathToTarget);
        }
      }
    }
  }
}
