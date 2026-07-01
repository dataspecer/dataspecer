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
  private isRunningInDocker: boolean;
  ////////////////////////////
  // Constructor
  ////////////////////////////
  constructor(httpFetch: HttpFetch, authenticationGitProvidersData: AuthenticationGitProvidersData, isRunningInDocker: boolean = false) {
    super(httpFetch, authenticationGitProvidersData);
    this.gitProviderInternalComposite = new GitProviderInternalCompositeNodeBase(this);
    this.isRunningInDocker = isRunningInDocker;
  }

  ////////////////////////////
  // Methods
  ////////////////////////////

  copyWorkflowFiles(copyTo: string): void {
    const workflowsDirPath = `${copyTo}/.github/workflows`;
    if(!fs.existsSync(workflowsDirPath)) {
      fs.mkdirSync(workflowsDirPath, { recursive: true });
    }

    let sourceWorkflowDirectory: string;
    if (this.isRunningInDocker) {
      // For docker we put it into database directory (we perform the copying in there in the Dockerfile on creation)
      //  The reason why we do that, is that if it is not in the database directory, we cannot use hardlink, because then it is in different
      //  device (filesystem), and therefore we would have to perform copy as a fallback, which is slower than just creating hardlink.
      sourceWorkflowDirectory = "./database/git-workflows/github/workflows";
    }
    else {
      sourceWorkflowDirectory = "./git-workflows/github/workflows";
    }
    createLinksForFiles(sourceWorkflowDirectory, workflowsDirPath);
  }

  async getLastCommitHash(repositoryOwner: string, repoName: string, commitReference?: string, isCommit?: boolean): Promise<string> {
    return this.gitProviderInternalComposite.getLastCommitHash(repositoryOwner, repoName, commitReference, isCommit);
  }

  async getLastCommitHashFromUrl(repositoryUrl: string, commitReferenceType: CommitReferenceType | null, commitReferenceValue: string | null): Promise<string> {
    return this.gitProviderInternalComposite.getLastCommitHashFromUrl(repositoryUrl, commitReferenceType, commitReferenceValue);
  }
}
