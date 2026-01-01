import { FetchResponse, type HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { AuthenticationGitProviderData, GitProviderBase } from "../git-provider-base.ts";
import { AuthenticationGitProvidersData, gitProviderDomains } from "../git-provider-factory.ts";
import { CommitReferenceType, CreateRemoteRepositoryReturnType, GetResourceForGitUrlAndBranchType, GitCredentials, GitProviderEnum, GitRef, GitProviderIndependentWebhookRequestData } from "../../git-provider-api.ts";
import { Scope } from "../../auth.ts";

// Note that students for some reason there have max 10 repositories limit on school mff gitlab (idk if it is for creations a day or something)

export class GitLabProvider extends GitProviderBase {
  ////////////////////////////
  // Fields
  ////////////////////////////
  protected domainURL: string;

  ////////////////////////////
  // Constructor
  ////////////////////////////
  constructor(httpFetch: HttpFetch, authenticationGitProvidersData: AuthenticationGitProvidersData, domainURL?: string) {
    const authenticationGitProviderData: AuthenticationGitProviderData = {
      gitBotConfiguration: authenticationGitProvidersData.gitBotConfigurations?.gitlab,
      authConfiguration: authenticationGitProvidersData.authConfiguration,
    };
    super(httpFetch, authenticationGitProviderData);

    this.domainURL = domainURL ?? gitProviderDomains[this.getGitProviderEnumValue()];
  }

  ////////////////////////////
  // Methods
  ////////////////////////////
  getGitProviderEnumValue(): GitProviderEnum {
    return GitProviderEnum.GitLab;
  }

  getDomainURL(shouldPrefixWithHttps: boolean): string {
    const prefix = shouldPrefixWithHttps ? "https://" : "";
    return prefix + this.domainURL;
  }

  setDomainURL(newDomainURL: string): void {
    this.domainURL = newDomainURL;
  }

  getGitPagesURL(repositoryUrl: string): string {
    throw new Error("Method not implemented.");
  }

  async extractDataForWebhookProcessing(
    webhookPayload: any,
    getResourceForGitUrlAndBranch: GetResourceForGitUrlAndBranchType
  ): Promise<GitProviderIndependentWebhookRequestData | null> {
    const repoName = webhookPayload.repository.name;
    // TODO: In future I will find it through the URL inside the prisma database instead
    const iri = String(repoName).split("-").at(-1);
    if (iri === undefined) {
      console.error("For some reason the webhook can't look up iri of package");
      return null;
    }

    const cloneURL = webhookPayload.repository.git_http_url;
    const commits = webhookPayload.commits;
    throw new Error("While all the code here is correct, it is missing how to get branch from the webhookPayload. " +
      "You can take inspiration in the GitHub implementation, it might be the same. " +
      "However you have to examine the webhook payload from GitLab yourself to confirm that.");
    // return {
    //   cloneURL,
    //   commits,
    //   repoName,
    //   iri,
    //   branch,
    // };
  }

  async removeRemoteRepository(authToken: string, repositoryOwner: string, repoName: string): Promise<FetchResponse> {
    // https://docs.gitlab.com/api/projects/#delete-a-project
    const urlSuffix = encodeURIComponent(`${repositoryOwner}/${repoName}`);
    const fetchResponse = this.httpFetch(`https://${this.domainURL}/api/v4/projects/` + urlSuffix, {
      method: "DELETE",
      headers: {
        'PRIVATE-TOKEN': authToken,
        'Content-Type': 'application/json'
      },
    });

    return fetchResponse;
  }
  async createWebhook(
    authToken: string,
    repositoryOwner: string,
    repositoryName: string,
    webhookHandlerURL: string,
    webhookEvents: string[]
  ): Promise<FetchResponse> {
    // !!! TODO: NOTE that this code ignores webhookEvents from arguments, so it needs fixing !!!


    // https://docs.gitlab.com/api/project_webhooks/#add-a-webhook-to-a-project
    // Unlike GitHub, the GitLab allows description for webhooks
    const payload = {
      "url": webhookHandlerURL,
      "description": "Auto-generated webhook for Dataspecer connection",
      "push_events": "true",
    };

    const variablePartOfURL = encodeURIComponent(`${repositoryOwner}/${repositoryName}`);
    const fetchResponse = this.httpFetch(`https://${this.domainURL}/api/v4/projects/${variablePartOfURL}/hooks`, {
      method: "POST",
      headers: {
        'PRIVATE-TOKEN': authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    return fetchResponse;
  }
  async createRemoteRepository(
    authToken: string,
    repositoryOwner: string,
    repoName: string,
    isUserRepo: boolean,
    shouldEnablePublicationBranch: boolean
  ): Promise<CreateRemoteRepositoryReturnType> {
    // https://docs.gitlab.com/api/projects/#create-a-project
    // Example curl request:
    // curl --request POST --header "PRIVATE-TOKEN: <your-token>" \
    //      --header "Content-Type: application/json" --data '{
    //         "name": "new_project", "description": "New Project", "path": "new_project",
    //         "namespace_id": "42", "initialize_with_readme": "true"}' \
    //      --url "https://gitlab.example.com/api/v4/projects/"
    // Note that this expects that the given authToken is for user and it is userRepo, not organization repo
    const payload = {
      "name": repoName,
      "description": "Auto-generated repository to test Dataspecer connection",
      "visibility": "public",
      "initialize_with_readme": "true",
    };

    const fetchResponse = await this.httpFetch(`https://${this.domainURL}/api/v4/projects/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PRIVATE-TOKEN": authToken,
      },
      body: JSON.stringify(payload),
    });

    if (fetchResponse.status < 200 || fetchResponse.status >= 300) {
      throw new Error(`Error when creating new remote GitLab repository: ${fetchResponse.status} ${fetchResponse}`);
    }

    const responseAsJSON = (await fetchResponse.json()) as any;
    const defaultBranch: string | null = responseAsJSON?.default_branch ?? null;
    return {
      response: fetchResponse,
      defaultBranch,
    };
  }

  getBotCredentials(): GitCredentials | null {
    throw new Error("Method not implemented. We currently don't have any GitLab bot.");
  }

  async setBotAsCollaborator(repositoryOwner: string, repoName: string, accessToken: string): Promise<FetchResponse> {
    throw new Error("Method not implemented.");
  }

  async setRepositorySecret(repositoryOwner: string, repoName: string, accessToken: string, secretKey: string, secretValue: string): Promise<FetchResponse> {
    throw new Error("Method not implemented.");
  }

  /**
   * @deprecated We put the GitHub (respectively here GitLab) pages on the same repository instead of onto separate publication repository
   */
  async createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryOwner?: string, accessToken?: string): Promise<FetchResponse> {
    throw new Error("Method not implemented.");
  }

  copyWorkflowFiles(copyTo: string): void {
    throw new Error("Method not implemented.");
  }

  getWorkflowFilesDirectoryName(): string {
    throw new Error("Method not implemented.");
  }

  isGitProviderDirectory(fullPath: string): boolean {
    throw new Error("Method not implemented.");
  }

  getDefaultBranch(repositoryURL: string): Promise<string | null> {
    throw new Error("Method not implemented.");
  }

  extractCommitReferenceValueFromRepositoryURLSplit(repositoryURLSplit: string[], commitReferenceType: CommitReferenceType): string | null {
    if (repositoryURLSplit.length < 4 || repositoryURLSplit.at(-2) !== "tree") {
      return null;
    }

    return repositoryURLSplit.at(-1)!;
  }

  protected getZipDownloadLink(owner: string, repo: string, commitName: string, commitReferenceType: CommitReferenceType): string {
    throw new Error("Method not implemented.");
  }

  createGitRepositoryURL(repositoryOwner: string, repoName: string, gitRef?: GitRef): string {
    // Well GitLab seems to be slightly different than GitHub. It has /-/ between the repoName and tree,
    // BUT it seems to work without it, so maybe the same implementation for gitlab can be used.
    throw new Error("Method not implemented.");
  }

  extractDefaultRepositoryUrl(repositoryUrl: string): string {
    // Once again it is possible that it has the same implementation as GitHub.
    throw new Error("Method not implemented.");
  }

  convertGenericScopeToProviderScope(scope: Scope): string[] {
    throw new Error("Method not implemented.");
  }
  convertProviderScopeToGenericScope(scope: string): Scope {
    throw new Error("Method not implemented.");
  }

  revokePAT(personalAccessToken: string): Promise<FetchResponse> {
    throw new Error("Method not implemented.");
  }
}
