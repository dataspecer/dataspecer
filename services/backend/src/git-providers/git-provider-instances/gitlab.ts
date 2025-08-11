import { FetchResponse } from "@dataspecer/core/io/fetch/fetch-api";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import { gitProviderDomains, GitProviderEnum, WebhookRequestDataProviderIndependent, GitCredentials, CommitReferenceType } from "../git-provider-api.ts";
import { GitProviderBase } from "../git-provider-base.ts";


export class GitLabProvider extends GitProviderBase {
  ////////////////////////////
  // Fields
  ////////////////////////////
  private domainURL: string;

  ////////////////////////////
  // Constructor
  ////////////////////////////
  constructor(domainURL?: string) {
    super();
    this.domainURL = domainURL ?? gitProviderDomains[this.getGitProviderEnumValue()];
  }

  ////////////////////////////
  // Methods
  ////////////////////////////
  getGitProviderEnumValue(): GitProviderEnum {
    return GitProviderEnum.GitLab;
  }

  getDomainURL(): string {
    return this.domainURL;
  }

  setDomainURL(newDomainURL: string): void {
    this.domainURL = newDomainURL;
  }

  extractDataForWebhookProcessing(webhookPayload: any): WebhookRequestDataProviderIndependent | null {
    const repoName = webhookPayload.repository.name;
    // TODO: In future I will find it through the URL inside the prisma database instead
    const iri = String(repoName).split("-").at(-1);
    if (iri === undefined) {
      console.error("For some reason the webhook can't look up iri of package");
      return null;
    }

    const cloneURL = webhookPayload.repository.git_http_url;
    const commits = webhookPayload.commits;

    return {
      cloneURL,
      commits,
      repoName,
      iri,
    };
  }

  async removeRemoteRepository(authToken: string, repositoryUserName: string, repoName: string): Promise<FetchResponse> {
    // https://docs.gitlab.com/api/projects/#delete-a-project
    const urlSuffix = encodeURIComponent(`${repositoryUserName}/${repoName}`);
    const fetchResponse = httpFetch(`https://${this.domainURL}/api/v4/projects/` + urlSuffix, {
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
    // https://docs.gitlab.com/api/project_webhooks/#add-a-webhook-to-a-project
    // TODO RadStr: Ignoring webhookEvents
    // Unlike GitHub, the GitLab allows description for webhooks
    const payload = {
      "url": webhookHandlerURL,
      "description": "Auto-generated webhook for Dataspecer connection",
      "push_events": "true",
    };

    const variablePartOfURL = encodeURIComponent(`${repositoryOwner}/${repositoryName}`);
    const fetchResponse = httpFetch(`https://${this.domainURL}/api/v4/projects/${variablePartOfURL}/hooks`, {
      method: "POST",
      headers: {
        'PRIVATE-TOKEN': authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    return fetchResponse;
  }
  async createRemoteRepository(authToken: string, repositoryUserName: string, repoName: string, isUserRepo: boolean): Promise<FetchResponse> {
    // https://docs.gitlab.com/api/projects/#create-a-project
    // Example curl request:
    // curl --request POST --header "PRIVATE-TOKEN: <your-token>" \
    //      --header "Content-Type: application/json" --data '{
    //         "name": "new_project", "description": "New Project", "path": "new_project",
    //         "namespace_id": "42", "initialize_with_readme": "true"}' \
    //      --url "https://gitlab.example.com/api/v4/projects/"
    // TODO RadStr: ? Maybe I won't do it - but this expects that the given authToken is for user and it is userRepo, not organization repo
    const payload = {
      "name": repoName,
      "description": "Auto-generated repository to test Dataspecer connection",
      "visibility": "public",
      "initialize_with_readme": "true",
    };

    const fetchResponse = httpFetch(`https://${this.domainURL}/api/v4/projects/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PRIVATE-TOKEN": authToken,
      },
      body: JSON.stringify(payload),
    });

    return fetchResponse;
  }

  getBotCredentials(): GitCredentials {
    // TODO RadStr: ... We won't, I am not giving out PAT for my mff account
    // TODO RadStr: So definitely remove the credentials and keep the error after we are done with testing
    // TODO RadStr: Just remove
    // return {
    //   name: GIT_RAD_STR_BOT_USERNAME,
    //   email: GIT_RAD_STR_BOT_EMAIL,
    //   accessToken: GITLAB_MFF_PERSONAL_API_CONTROL_TOKEN,
    // };
    throw new Error("Method not implemented. We currently don't have any GitLab bot.");
  }

  async setBotAsCollaborator(repositoryUserName: string, repoName: string, accessToken: string): Promise<FetchResponse> {
    throw new Error("Method not implemented.");
  }

  async setRepositorySecret(repositoryUserName: string, repoName: string, accessToken: string, secretKey: string, secretValue: string): Promise<FetchResponse> {
    throw new Error("Method not implemented.");
  }

  async createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryUserName?: string, accessToken?: string): Promise<FetchResponse> {
    throw new Error("Method not implemented.");
  }

  copyWorkflowFiles(targetPackageIRI: string): void {
    throw new Error("Method not implemented.");
  }

  isGitProviderDirectory(fullPath: string): boolean {
    throw new Error("Method not implemented.");
  }

  getDefaultBranch(repositoryURL: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  extractCommitNameFromRepositoryURLSplit(repositoryURLSplit: string[], commitType: CommitReferenceType): string | null {
    if (repositoryURLSplit.length < 4 || repositoryURLSplit.at(-2) !== "tree") {
      return null;
    }

    return repositoryURLSplit.at(-1)!;
  }

  protected getZipDownloadLink(owner: string, repo: string, commitName: string, commitType: CommitReferenceType): string {
    throw new Error("Method not implemented.");
  }
}
