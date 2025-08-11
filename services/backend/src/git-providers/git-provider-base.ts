import { FetchResponse } from "@dataspecer/core/io/fetch/fetch-api";
import { CommitReferenceType, ExtractedCommitNameFromRepositoryURL, GitCredentials, GitProvider, GitProviderEnum, RepositoryURLParts, WebhookRequestDataProviderIndependent } from "./git-provider-api.ts";

export abstract class GitProviderBase implements GitProvider {
  abstract getGitProviderEnumValue(): GitProviderEnum;
  abstract getDomainURL(): string;
  abstract setDomainURL(newDomainURL: string): void;
  abstract extractDataForWebhookProcessing(webhookPayload: any): WebhookRequestDataProviderIndependent | null;
  abstract createRemoteRepository(authToken: string, repositoryUserName: string, repoName: string, isUserRepo: boolean): Promise<FetchResponse>;
  abstract removeRemoteRepository(authToken: string, repositoryUserName: string, repoName: string): Promise<FetchResponse>;
  abstract createWebhook(authToken: string, repositoryOwner: string, repositoryName: string, webhookHandlerURL: string, webhookEvents: string[]): Promise<FetchResponse>;
  abstract getBotCredentials(): GitCredentials;
  abstract setBotAsCollaborator(repositoryUserName: string, repoName: string, accessToken: string): Promise<FetchResponse>;
  abstract setRepositorySecret(repositoryUserName: string, repoName: string, accessToken: string, secretKey: string, secretValue: string): Promise<FetchResponse>;
  abstract createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryUserName?: string, accessToken?: string): Promise<FetchResponse>;
  abstract copyWorkflowFiles(targetPackageIRI: string): void;
  abstract isGitProviderDirectory(fullPath: string): boolean;
  abstract getDefaultBranch(repositoryURL: string): Promise<string>;

  /**
   * @param repositoryURLSplit is the repository URL split by "/", this is internal method used inside {@link extractPartOfRepositoryURL}.
   * Extracts the commit name from the {@link repositoryURLSplit}. Or null if not present (then it should be treated as default branch).
   * The return name depends on the {@link part}, it is either commit hash or name of branch/tag
   */
  protected abstract extractCommitNameFromRepositoryURLSplit(repositoryURLSplit: string[], commitType: CommitReferenceType): string | null;

  async getCommitNameFromRepositoryURL(repositoryURL: string, commitType: CommitReferenceType): Promise<ExtractedCommitNameFromRepositoryURL> {
    const commitName = this.extractPartOfRepositoryURL(repositoryURL, commitType);

    if (commitName === null) {
      return {
        commitName: await this.getDefaultBranch(repositoryURL),
        fallbackToDefaultBranch: true
      };
    }

    return { commitName, fallbackToDefaultBranch: false };
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
        return this.extractCommitNameFromRepositoryURLSplit(pathParts, part);
      }

      return null;
    }
    catch (error) {
      return null;
    }
  }

  async convertRepoURLToDownloadZipURL(repositoryURL: string, commitType: CommitReferenceType): Promise<string> {
    const repo = this.extractPartOfRepositoryURL(repositoryURL, "repository-name");
    const owner = this.extractPartOfRepositoryURL(repositoryURL, "user-name");     // TODO RadStr: Rename user to owner everywhere
    const commitNameInfo = await this.getCommitNameFromRepositoryURL(repositoryURL, commitType);

    if (owner === null) {
      throw new Error(`Could not extract the owner (${owner}) from ${repositoryURL}`);
    }

    if (repo === null) {
      throw new Error(`Could not extract the repository (${repo}) from ${repositoryURL}`);
    }

    const commitTypeBasedOnURL = commitNameInfo.fallbackToDefaultBranch ? "branch" : commitType;
    const zipURL = this.getZipDownloadLink(owner!, repo!, commitNameInfo.commitName, commitTypeBasedOnURL);
    return zipURL;
  }

  /**
   * @param commitType Some git providers might change the URL based on the type of commit. For example Github - however Github also allows
   *  one uniform type of download url and it treats it like commit.
   * @returns The zip link from given arguments to download repository.
   */
  protected abstract getZipDownloadLink(owner: string, repo: string, commitName: string, commitType: CommitReferenceType): string;
}