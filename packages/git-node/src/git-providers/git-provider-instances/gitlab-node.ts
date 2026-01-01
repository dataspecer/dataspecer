import { type HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { AuthenticationGitProvidersData, GitLabProvider } from "@dataspecer/git/git-providers";
import { CommitReferenceType, GitProviderInternalCompositeNode, GitProviderNode } from "@dataspecer/git";
import { GitProviderInternalCompositeNodeBase } from "../git-provider-base-node.ts";

// Note that students for some reason there have max 10 repositories limit on school mff gitlab (idk if it is for creations a day or something)

export class GitLabNodeProvider extends GitLabProvider implements GitProviderNode {
  ////////////////////////////
  // Fields
  ////////////////////////////
  private gitProviderInternalComposite: GitProviderInternalCompositeNode;
  ////////////////////////////
  // Constructor
  ////////////////////////////
  constructor(httpFetch: HttpFetch, authenticationGitProvidersData: AuthenticationGitProvidersData, domainURL?: string) {
    super(httpFetch, authenticationGitProvidersData, domainURL);
    this.gitProviderInternalComposite = new GitProviderInternalCompositeNodeBase(this);
  }

  ////////////////////////////
  // Methods
  ////////////////////////////
  copyWorkflowFiles(copyTo: string): void {
    throw new Error("Method not implemented.");
  }

  async getLastCommitHash(repositoryOwner: string, repoName: string, commitReference?: string, isCommit?: boolean): Promise<string> {
    return this.gitProviderInternalComposite.getLastCommitHash(repositoryOwner, repoName, commitReference, isCommit);
  }

  async getLastCommitHashFromUrl(repositoryUrl: string, commitReferenceType: CommitReferenceType | null, commitReferenceValue: string | null): Promise<string> {
    return this.gitProviderInternalComposite.getLastCommitHashFromUrl(repositoryUrl, commitReferenceType, commitReferenceValue);
  }
}
