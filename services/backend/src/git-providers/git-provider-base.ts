import { FetchResponse, HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { CommitReferenceType, ConvertRepoURLToDownloadZipURLReturnType, CreateRemoteRepositoryReturnType, GitProvider, GitProviderEnum, RepositoryURLPart, Scope, WebhookRequestDataGitProviderIndependent, GitCredentials, ExtractedCommitReferenceValueFromRepositoryURLExplicit, ExtractedCommitReferenceValueFromRepositoryURL } from "@dataspecer/git";
import { removePathRecursively } from "@dataspecer/git-node";
import { simpleGit } from "simple-git";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { ROOT_DIRECTORY_FOR_PRIVATE_GITS } from "../utils/git-store-info.ts";

export abstract class GitProviderBase implements GitProvider {
  protected httpFetch: HttpFetch;
  constructor(httpFetch: HttpFetch) {
    this.httpFetch = httpFetch;
  }

  abstract getGitProviderEnumValue(): GitProviderEnum;
  abstract getDomainURL(shouldPrefixWithHttps: boolean): string;
  abstract setDomainURL(newDomainURL: string): void;
  abstract extractDataForWebhookProcessing(webhookPayload: any): Promise<WebhookRequestDataGitProviderIndependent | null>;
  abstract createRemoteRepository(authToken: string, repositoryUserName: string, repoName: string, isUserRepo: boolean, shouldEnablePublicationBranch: boolean): Promise<CreateRemoteRepositoryReturnType>;
  abstract removeRemoteRepository(authToken: string, repositoryUserName: string, repoName: string): Promise<FetchResponse>;
  abstract createWebhook(authToken: string, repositoryOwner: string, repositoryName: string, webhookHandlerURL: string, webhookEvents: string[]): Promise<FetchResponse>;
  abstract getBotCredentials(): GitCredentials | null;
  abstract setBotAsCollaborator(repositoryUserName: string, repoName: string, accessToken: string): Promise<FetchResponse>;
  abstract setRepositorySecret(repositoryUserName: string, repoName: string, accessToken: string, secretKey: string, secretValue: string): Promise<FetchResponse>;
  /**
   * @deprecated We put the GitHub pages on the same repository instead of onto separate publication repository
   */
  abstract createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryUserName?: string, accessToken?: string): Promise<FetchResponse>;
  abstract copyWorkflowFiles(copyTo: string): void;
  abstract getWorkflowFilesDirectoryName(): string;
  abstract isGitProviderDirectory(fullPath: string): boolean;
  abstract getDefaultBranch(repositoryURL: string): Promise<string | null>;
  abstract createGitRepositoryURL(userName: string, repoName: string, branch?: string): string;
  abstract extractDefaultRepositoryUrl(repositoryUrl: string): string;
  abstract convertGenericScopeToProviderScope(scope: Scope): string[];
  abstract convertProviderScopeToGenericScope(scope: string): Scope;
  abstract revokePAT(personalAccessToken: string): Promise<FetchResponse>;

  async getLastCommitHash(userName: string, repoName: string, commitReference?: string, isCommit?: boolean): Promise<string> {
    if (isCommit === true) {
      if (commitReference === undefined) {
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

    let gitTmpDirectory: string;
    while (true) {
      const uuid = uuidv4();
      gitTmpDirectory = `${ROOT_DIRECTORY_FOR_PRIVATE_GITS}/tmp/${uuid}`;
      if (!fs.existsSync(gitTmpDirectory)) {
        // We found unique directory to put repo into
        break;
      }
    }

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
        throw new Error(`Could not get the last commit from given userName: ${userName}, repoName: ${repoName}, branch: ${commitReference}`);
      }
      return hash;
    }
    catch(error) {
      throw error;    // Just rethrow it.
    }
    finally {
      removePathRecursively(gitTmpDirectory);
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
      commitReferenceValue = (await this.extractCommitReferenceValue(repositoryUrl, commitReferenceType)).commitReferenceValue;
    }

    return this.getLastCommitHash(userName, repoName, commitReferenceValue ?? undefined, commitReferenceType === "commit");
  }

  /**
   * @param repositoryURLSplit is the repository URL split by "/", this is internal method used inside {@link extractPartOfRepositoryURL}.
   * Extracts the commit name from the {@link repositoryURLSplit}. Or null if not present (then it should be treated as default branch).
   * The return name depends on the {@link part}, it is either commit hash or name of branch/tag
   */
  protected abstract extractCommitReferenceValueFromRepositoryURLSplit(repositoryURLSplit: string[], commitReferenceType: CommitReferenceType): string | null;

  async extractCommitReferenceValue(
    repositoryURL: string,
    commitReferenceType: CommitReferenceType
  ): Promise<ExtractedCommitReferenceValueFromRepositoryURL> {
    const commitReferenceValue = this.extractPartOfRepositoryURL(repositoryURL, commitReferenceType);

    if (commitReferenceValue === null) {
      return {
        commitReferenceValue: await this.getDefaultBranch(repositoryURL),
        fallbackToDefaultBranch: true
      };
    }

    return { commitReferenceValue, fallbackToDefaultBranch: false };
  }

  extractPartOfRepositoryURL(repositoryURL: string, part: RepositoryURLPart): string | null {
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
    const commitReferenceValueInfo = await this.extractCommitReferenceValue(repositoryURL, commitReferenceType);

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
      commitReferenceValueInfo: commitReferenceValueInfo as ExtractedCommitReferenceValueFromRepositoryURLExplicit,   // If it was nullable we threw error
    };
  }

  /**
   * @param commitReferenceType Some git providers might change the URL based on the type of commit. For example Github - however Github also allows
   *  one uniform type of download url and it treats it like commit.
   * @returns The zip link from given arguments to download repository.
   */
  protected abstract getZipDownloadLink(owner: string, repo: string, commitName: string, commitReferenceType: CommitReferenceType): string;
}
