import { FetchResponse, HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { CommitReferenceType, ConvertRepoURLToDownloadZipURLReturnType, CreateRemoteRepositoryReturnType, ExtractedCommitReferenceValueFromRepositoryURL, ExtractedCommitReferenceValueFromRepositoryURLExplicit, GetResourceForGitUrlAndBranchType, GitCredentials, GitProvider, GitProviderEnum, GitRef, RepositoryURLPart, GitProviderIndependentWebhookRequestData } from "../git-provider-api.ts";
import { Scope } from "../auth.ts";
import { type GitBotConfiguration, type OAuthConfiguration } from "@dataspecer/auth";

export type AuthenticationGitProviderData = {
  gitBotConfiguration?: GitBotConfiguration;
  authConfiguration?: OAuthConfiguration;
};

export abstract class GitProviderBase implements GitProvider {
  protected httpFetch: HttpFetch;
  protected authenticationGitProviderData: AuthenticationGitProviderData;
  constructor(httpFetch: HttpFetch, authenticationGitProviderData: AuthenticationGitProviderData) {
    this.httpFetch = httpFetch;
    this.authenticationGitProviderData = authenticationGitProviderData;
  }

  public getAuthenticationGitProviderData(): AuthenticationGitProviderData {
    return this.authenticationGitProviderData;
  }

  abstract getGitProviderEnumValue(): GitProviderEnum;
  abstract getDomainURL(shouldPrefixWithHttps: boolean): string;
  abstract setDomainURL(newDomainURL: string): void;
  abstract getGitPagesURL(repositoryUrl: string): string;
  abstract extractDataForWebhookProcessing(webhookPayload: any, getResourceForGitUrlAndBranch: GetResourceForGitUrlAndBranchType): Promise<GitProviderIndependentWebhookRequestData | null>;
  abstract createRemoteRepository(authToken: string, repositoryOwner: string, repoName: string, isUserRepo: boolean, shouldEnablePublicationBranch: boolean): Promise<CreateRemoteRepositoryReturnType>;
  abstract removeRemoteRepository(authToken: string, repositoryOwner: string, repoName: string): Promise<FetchResponse>;
  abstract createWebhook(authToken: string, repositoryOwner: string, repositoryName: string, webhookHandlerURL: string, webhookEvents: string[]): Promise<FetchResponse>;
  abstract getBotCredentials(): GitCredentials | null;
  abstract setBotAsCollaborator(repositoryOwner: string, repoName: string, accessToken: string): Promise<FetchResponse>;
  abstract setRepositorySecret(repositoryOwner: string, repoName: string, accessToken: string, secretKey: string, secretValue: string): Promise<FetchResponse>;
  /**
   * @deprecated We put the GitHub pages on the same repository instead of onto separate publication repository
   */
  abstract createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryOwner?: string, accessToken?: string): Promise<FetchResponse>;
  abstract getWorkflowFilesDirectoryName(): string;
  abstract isGitProviderDirectory(fullPath: string): boolean;
  abstract getDefaultBranch(repositoryURL: string): Promise<string | null>;
  abstract createGitRepositoryURL(repositoryOwner: string, repoName: string, gitRef?: GitRef): string;
  abstract extractDefaultRepositoryUrl(repositoryUrl: string): string;
  abstract convertGenericScopeToProviderScope(scope: Scope): string[];
  abstract convertProviderScopeToGenericScope(scope: string): Scope;
  abstract revokePAT(personalAccessToken: string): Promise<FetchResponse>;

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
      else if (part === "repository-owner") {
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
    const owner = this.extractPartOfRepositoryURL(repositoryURL, "repository-owner");
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
