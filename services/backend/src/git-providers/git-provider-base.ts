import { FetchResponse } from "@dataspecer/core/io/fetch/fetch-api";
import { CommitReferenceType, ConvertRepoURLToDownloadZipURLReturnType, createRemoteRepositoryReturnType, ExtractedCommitReferenceValueFromRepositoryURL, GitCredentials, GitProvider, GitProviderEnum, RepositoryURLParts, WebhookRequestDataProviderIndependent } from "@dataspecer/git";
import { simpleGit } from "simple-git";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import fs from "fs";
import { extractPartOfRepositoryURL } from "../utils/git-utils.ts";
import { GitHubProvider } from "./git-provider-instances/github.ts";
import { GitLabProvider } from "./git-provider-instances/gitlab.ts";

export abstract class GitProviderBase implements GitProvider {
  abstract getGitProviderEnumValue(): GitProviderEnum;
  abstract getDomainURL(shouldPrefixWithHttps: boolean): string;
  abstract setDomainURL(newDomainURL: string): void;
  abstract extractDataForWebhookProcessing(webhookPayload: any): Promise<WebhookRequestDataProviderIndependent | null>;
  abstract createRemoteRepository(authToken: string, repositoryUserName: string, repoName: string, isUserRepo: boolean): Promise<createRemoteRepositoryReturnType>;
  abstract removeRemoteRepository(authToken: string, repositoryUserName: string, repoName: string): Promise<FetchResponse>;
  abstract createWebhook(authToken: string, repositoryOwner: string, repositoryName: string, webhookHandlerURL: string, webhookEvents: string[]): Promise<FetchResponse>;
  abstract getBotCredentials(): GitCredentials;
  abstract setBotAsCollaborator(repositoryUserName: string, repoName: string, accessToken: string): Promise<FetchResponse>;
  abstract setRepositorySecret(repositoryUserName: string, repoName: string, accessToken: string, secretKey: string, secretValue: string): Promise<FetchResponse>;
  abstract createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryUserName?: string, accessToken?: string): Promise<FetchResponse>;
  abstract copyWorkflowFiles(copyTo: string): void;
  abstract isGitProviderDirectory(fullPath: string): boolean;
  abstract getDefaultBranch(repositoryURL: string): Promise<string | null>;
  abstract createGitRepositoryURL(userName: string, repoName: string, branch?: string): string;
  abstract extractDefaultRepositoryUrl(repositoryUrl: string): string;

  async getLastCommitHash(userName: string, repoName: string, commitReference?: string, isCommit?: boolean): Promise<string> {
    if (isCommit === true) {
      if (commitReference === undefined) {
        // TODO RadStr: Maybe better error handling
        throw new Error(`When trying to get last commit for userName: ${userName} and repoName: ${repoName}. It was supposed to be commit, however the value of commmit was not given`);
      }
      return commitReference;
    }

    const options = [
      "--depth", "1",
    ];
    if (commitReference !== undefined) {
      options.push("--revision", commitReference);
    }

    const uuids = [
      uuidv4(),
      uuidv4(),
    ];
    const uuidPath = uuids.join("");
    const gitTmpDirectory = `./tmp/${uuidPath}`
    try {
      fs.mkdirSync(gitTmpDirectory, { recursive: true });
      const git = simpleGit(gitTmpDirectory);

      // TODO: Note that this not work for non-public repositories
      // Not providing in the branch, we just want the base url with userName and repoName
      const repositoryUrl = this.createGitRepositoryURL(userName, repoName);
      await git.clone(repositoryUrl, ".", options);
      const gitLog = await git.log({ n: 1 });
      const hash = gitLog.latest?.hash;

      if (hash === undefined) {
        throw new Error(`Could not get the last commit from given userName: ${userName}, repoName: ${repoName}, branch: ${commitReference}`);        // TODO RadStr: Maybe better error handling
      }
      return hash;
    }
    catch(error) {
      throw error;    // Just rethrow it.
    }
    finally {
      fs.rmSync(gitTmpDirectory, { recursive: true, force: true });
    }
  }

  async getLastCommitHashFromUrl(repositoryUrl: string, commitReferenceType: CommitReferenceType | null, commitReferenceValue: string | null): Promise<string> {
    commitReferenceType ??= "branch";

    const userName = this.extractPartOfRepositoryURL(repositoryUrl, "user-name");
    const repoName = this.extractPartOfRepositoryURL(repositoryUrl, "repository-name");
    if (userName === null) {
      throw new Error(`Could not extract userName from given ${repositoryUrl}`);
    }
    else if (repoName === null) {
      throw new Error(`Could not extract repoName from given ${repositoryUrl}`);
    }
    if (commitReferenceValue === null) {
      commitReferenceValue = (await this.getCommitReferenceValue(repositoryUrl, commitReferenceType)).commitReferenceValue;
    }

    return this.getLastCommitHash(userName, repoName, commitReferenceValue ?? undefined, commitReferenceType === "commit");
  }

  /**
   * @param repositoryURLSplit is the repository URL split by "/", this is internal method used inside {@link extractPartOfRepositoryURL}.
   * Extracts the commit name from the {@link repositoryURLSplit}. Or null if not present (then it should be treated as default branch).
   * The return name depends on the {@link part}, it is either commit hash or name of branch/tag
   */
  protected abstract extractCommitReferenceValueFromRepositoryURLSplit(repositoryURLSplit: string[], commitReferenceType: CommitReferenceType): string | null;

  async getCommitReferenceValue(repositoryURL: string, commitReferenceType: CommitReferenceType): Promise<ExtractedCommitReferenceValueFromRepositoryURL> {
    const commitReferenceValue = this.extractPartOfRepositoryURL(repositoryURL, commitReferenceType);

    if (commitReferenceValue === null) {
      return {
        commitReferenceValue: await this.getDefaultBranch(repositoryURL),
        fallbackToDefaultBranch: true
      };
    }

    return { commitReferenceValue, fallbackToDefaultBranch: false };
  }

  extractPartOfRepositoryURL(repositoryURL: string, part: RepositoryURLParts): string | null {
    try {
      const parsedUrl = new URL(repositoryURL);

      if (part === "url-domain") {
        return parsedUrl.host;
      }

      // TODO: Not checking if the repository URL is correct
      const pathParts = parsedUrl.pathname.split("/").filter(part => part.length > 0);

      if (pathParts.length < 2) {
        return null;
      }

      // Where pathParts = ["mff-uk", "dataspecer", "tree", "stable"] for the above example
      if (part === "repository-name") {
        return pathParts[1];
      }
      else if (part === "user-name") {
        return pathParts[0];
      }
      else if (part === "branch" || part === "tag" || part === "commit") {
        return this.extractCommitReferenceValueFromRepositoryURLSplit(pathParts, part);
      }

      return null;
    }
    catch (error) {
      return null;
    }
  }

  async convertRepoURLToDownloadZipURL(repositoryURL: string, commitReferenceType: CommitReferenceType): Promise<ConvertRepoURLToDownloadZipURLReturnType> {
    const repo = this.extractPartOfRepositoryURL(repositoryURL, "repository-name");
    const owner = this.extractPartOfRepositoryURL(repositoryURL, "user-name");     // TODO RadStr: Rename user to owner everywhere
    const commitReferenceValueInfo = await this.getCommitReferenceValue(repositoryURL, commitReferenceType);

    if (owner === null) {
      throw new Error(`Could not extract the owner (${owner}) from ${repositoryURL}`);
    }

    if (repo === null) {
      throw new Error(`Could not extract the repository (${repo}) from ${repositoryURL}`);
    }

    if (commitReferenceValueInfo.commitReferenceValue === null) {
      throw new Error(`Could not extract the commit reference value needed to get zip url. The given repository url looked like this: ${repositoryURL}`);
    }

    const commitReferenceTypeWithFallback = commitReferenceValueInfo.fallbackToDefaultBranch ? "branch" : commitReferenceType;
    const zipURL = this.getZipDownloadLink(owner, repo, commitReferenceValueInfo.commitReferenceValue, commitReferenceTypeWithFallback);
    return {
      zipURL,
      commitReferenceValueInfo,
    };
  }

  /**
   * @param commitReferenceType Some git providers might change the URL based on the type of commit. For example Github - however Github also allows
   *  one uniform type of download url and it treats it like commit.
   * @returns The zip link from given arguments to download repository.
   */
  protected abstract getZipDownloadLink(owner: string, repo: string, commitName: string, commitReferenceType: CommitReferenceType): string;
}

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
