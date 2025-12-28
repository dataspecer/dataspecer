import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import fs from "fs";
// Using this one since I could not make the ones for nodeJS (one is not using ES modules and the other one seems to be too old and correctly support types)
import { CommitReferenceType, GitProviderInternalCompositeNode, GitProviderNode } from "@dataspecer/git";
import { AuthenticationGitProvidersData, GitHubProvider } from "@dataspecer/git/git-providers";
import { createLinksForFiles } from "../git-provider-factory-node.ts";
import { GitProviderInternalCompositeNodeBase } from "../git-provider-base-node.ts";


export class GitHubNodeProvider extends GitHubProvider implements GitProviderNode {
  ////////////////////////////
  // Fields
  ////////////////////////////
  private gitProviderInternalComposite: GitProviderInternalCompositeNode;
  ////////////////////////////
  // Constructor
  ////////////////////////////
  constructor(httpFetch: HttpFetch, authenticationGitProvidersData: AuthenticationGitProvidersData) {
    super(httpFetch, authenticationGitProvidersData);
    this.gitProviderInternalComposite = new GitProviderInternalCompositeNodeBase(this);
  }

  ////////////////////////////
  // Methods
  ////////////////////////////

  copyWorkflowFiles(copyTo: string): void {
    const workflowsDirPath = `${copyTo}/.github/workflows`;
    if(!fs.existsSync(workflowsDirPath)) {
      fs.mkdirSync(workflowsDirPath, { recursive: true });
    }

    const sourceWorkflowDirectory = "./git-workflows/github/workflows";
    createLinksForFiles(sourceWorkflowDirectory, workflowsDirPath);
  }

  async getLastCommitHash(userName: string, repoName: string, commitReference?: string, isCommit?: boolean): Promise<string> {
    return this.gitProviderInternalComposite.getLastCommitHash(userName, repoName, commitReference, isCommit);
  }

  async getLastCommitHashFromUrl(repositoryUrl: string, commitReferenceType: CommitReferenceType | null, commitReferenceValue: string | null): Promise<string> {
    return this.gitProviderInternalComposite.getLastCommitHashFromUrl(repositoryUrl, commitReferenceType, commitReferenceValue);
  }
}
