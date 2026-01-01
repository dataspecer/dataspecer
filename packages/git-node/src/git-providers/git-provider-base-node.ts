import { FetchResponse, HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { CommitReferenceType, CreateRemoteRepositoryReturnType, GitProvider, GitProviderEnum, Scope, WebhookRequestDataGitProviderIndependent, GitCredentials, GetResourceForGitUrlAndBranchType, GitProviderNode, GitProviderInternalCompositeNode, GitRef } from "@dataspecer/git";
import { simpleGit } from "simple-git";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { removePathRecursively } from "../git-utils-node.ts";
import { ROOT_DIRECTORY_FOR_PRIVATE_GITS } from "../git-store-info.ts";
import { AuthenticationGitProviderData, GitProviderBase } from "@dataspecer/git/git-providers";


/**
 * @deprecated Probably deprecated, we just use {@link GitProviderBase} directly on the implementations (such as GitHub or GitLab).
 */
export abstract class GitProviderNodeBase extends GitProviderBase implements GitProviderNode {
  protected gitProvider: GitProvider;

  constructor(httpFetch: HttpFetch, authenticationGitProviderData: AuthenticationGitProviderData, gitProvider: GitProvider) {
    super(httpFetch, authenticationGitProviderData);
    this.gitProvider = gitProvider;
  }

  abstract getGitProviderEnumValue(): GitProviderEnum;
  abstract getDomainURL(shouldPrefixWithHttps: boolean): string;
  abstract setDomainURL(newDomainURL: string): void;
  abstract getGitPagesURL(repositoryUrl: string): string;
  abstract extractDataForWebhookProcessing(webhookPayload: any, getResourceForGitUrlAndBranch: GetResourceForGitUrlAndBranchType): Promise<WebhookRequestDataGitProviderIndependent | null>;
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
  abstract createGitRepositoryURL(userName: string, repoName: string, gitRef?: GitRef): string;
  abstract extractDefaultRepositoryUrl(repositoryUrl: string): string;
  abstract convertGenericScopeToProviderScope(scope: Scope): string[];
  abstract convertProviderScopeToGenericScope(scope: string): Scope;
  abstract revokePAT(personalAccessToken: string): Promise<FetchResponse>;
  abstract getLastCommitHash(userName: string, repoName: string, commitReference?: string, isCommit?: boolean): Promise<string>;
  abstract getLastCommitHashFromUrl(repositoryUrl: string, commitReferenceType: CommitReferenceType | null, commitReferenceValue: string | null): Promise<string>;

  /**
   * @param repositoryURLSplit is the repository URL split by "/", this is internal method used inside {@link extractPartOfRepositoryURL}.
   * Extracts the commit name from the {@link repositoryURLSplit}. Or null if not present (then it should be treated as default branch).
   * The return name depends on the {@link part}, it is either commit hash or name of branch/tag
   */
  protected abstract extractCommitReferenceValueFromRepositoryURLSplit(repositoryURLSplit: string[], commitReferenceType: CommitReferenceType): string | null;
}


export class GitProviderInternalCompositeNodeBase implements GitProviderInternalCompositeNode {
  private gitProvider: GitProvider;

  public constructor(gitProvider: GitProvider) {
    this.gitProvider = gitProvider;
  }

  async getLastCommitHash(userName: string, repoName: string, commitReference?: string, isCommit?: boolean): Promise<string | null> {
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
      const repositoryUrl = this.gitProvider.createGitRepositoryURL(userName, repoName);
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

    const userName = this.gitProvider.extractPartOfRepositoryURL(repositoryUrl, "user-name");
    const repoName = this.gitProvider.extractPartOfRepositoryURL(repositoryUrl, "repository-name");
    if (userName === null) {
      throw new Error(`Could not extract userName from given ${repositoryUrl}`);
    }
    else if (repoName === null) {
      throw new Error(`Could not extract repoName from given ${repositoryUrl}`);
    }
    if (commitReferenceValue === null) {
      commitReferenceValue = (await this.gitProvider.extractCommitReferenceValue(repositoryUrl, commitReferenceType)).commitReferenceValue;
    }

    return this.getLastCommitHash(userName, repoName, commitReferenceValue ?? undefined, commitReferenceType === "commit");
  }

}