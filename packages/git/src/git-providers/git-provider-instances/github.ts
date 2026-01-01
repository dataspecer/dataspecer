import { FetchResponse, HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
// Using this one since I could not make the ones for nodeJS (one is not using ES modules and the other one seems to be too old and correctly support types)
import sodium from "libsodium-wrappers-sumo";
import { AuthenticationGitProviderData, GitProviderBase } from "../git-provider-base.ts";
import { AuthenticationGitProvidersData, gitProviderDomains } from "../git-provider-factory.ts";
import { AccessToken, AccessTokenType, CommitReferenceType, CreateRemoteRepositoryReturnType, GetResourceForGitUrlAndBranchType, GitCredentials, GitProviderEnum, GitRef, PUBLICATION_BRANCH_NAME, GitProviderIndependentWebhookRequestData } from "../../git-provider-api.ts";
import { Scope } from "../../auth.ts";
import { GitRestApiOperationError } from "../../error-definitions.ts";
import { findPatAccessToken, GITHUB_USER_AGENT } from "../../git-utils.ts";


const scopes = ["read:user", "user:email", "public_repo", "workflow", "delete_repo"] as const;
export type GitHubScope = typeof scopes[number];

// Note:
// Even though the request usually work without, the docs demand to specify User-Agent in headers for REST API requests
// https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api?apiVersion=2022-11-28#user-agent

export class GitHubProvider extends GitProviderBase {
  ////////////////////////////
  // Fields
  ////////////////////////////

  ////////////////////////////
  // Constructor
  ////////////////////////////
  constructor(httpFetch: HttpFetch, authenticationGitProvidersData: AuthenticationGitProvidersData) {
    const authenticationGitProviderData: AuthenticationGitProviderData = {
      gitBotConfiguration: authenticationGitProvidersData.gitBotConfigurations?.github,
      authConfiguration: authenticationGitProvidersData.authConfiguration,
    };
    super(httpFetch, authenticationGitProviderData);
  }

  ////////////////////////////
  // Methods
  ////////////////////////////

  getGitProviderEnumValue(): GitProviderEnum {
    return GitProviderEnum.GitHub;
  }

  getDomainURL(shouldPrefixWithHttps: boolean): string {
    const prefix = shouldPrefixWithHttps ? "https://" : "";
    return prefix + gitProviderDomains[this.getGitProviderEnumValue()];
  }

  setDomainURL(newDomainURL: string): void {
    // EMPTY - GitHub has only one domain
  }

  getGitPagesURL(repositoryUrl: string): string {
    const owner = this.extractPartOfRepositoryURL(repositoryUrl, "user-name");
    const repositoryName = this.extractPartOfRepositoryURL(repositoryUrl, "repository-name");
    return `https://${owner}.github.io/${repositoryName}`;
  }

  async extractDataForWebhookProcessing(webhookPayload: any, getResourceForGitUrlAndBranch: GetResourceForGitUrlAndBranchType): Promise<GitProviderIndependentWebhookRequestData | null> {
    // https://docs.github.com/en/webhooks/webhook-events-and-payloads#push

    const refPrefix = "refs/heads/";
    const branch = webhookPayload.ref.substring(refPrefix.length);
    const repoName = webhookPayload.repository.name;
    const repoURL = webhookPayload.repository.html_url;
    const resourceToUpdateInWebhook = await getResourceForGitUrlAndBranch(repoURL, branch);

    const iri = resourceToUpdateInWebhook?.iri;
    if (iri === undefined) {
      // This means that new branch was added to git, but the branch does not have equivalent in the DS
      // TODO RadStr Idea: We could create new package automatically, but I am not sure if we want that
      return null;
    }

    const gitURL = webhookPayload.repository.git_url;
    const cloneURL = webhookPayload.repository.clone_url;
    const commits = webhookPayload.commits;
    // Head commit
    // const beforeCommit = webhookPayload.before;
    // const afterCommit = webhookPayload.after;
    // const lastCommit = webhookPayload.head_commit;
    // const { id: lastId, tree_id: lastTreeId, url: lastUrl, added, removed, modified } = lastCommit;

    return {
      cloneURL,
      commits,
      repoName,
      iri,
      branch,
    };
  }

  removeRemoteRepository(authToken: string, repositoryUserName: string, repoName: string): Promise<FetchResponse> {
    // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#delete-a-repository
    const fetchResponse = this.httpFetch(`https://api.github.com/repos/${repositoryUserName}/${repoName}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/vnd.github+json",
        "Authorization": `Bearer ${authToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Accept": "application/vnd.github+json",
        "User-Agent": GITHUB_USER_AGENT,
      },
    });

    return fetchResponse;
  }

  async createWebhook(
    authToken: string,
    repositoryOwner: string,
    repositoryName: string,
    webhookHandlerURL: string,
    webhookEvents: string[],
  ): Promise<FetchResponse> {
    // https://docs.github.com/en/rest/repos/webhooks?apiVersion=2022-11-28#create-a-repository-webhook

    const webhookPayload = {
      "name": "web",
      "active": true,
      "events": webhookEvents,
      "description": "Auto-generated webhook for Dataspecer connection",
      "config": {
        "url": webhookHandlerURL,
        "content_type": "x-www-form-urlencoded",    // Or can be JSON
        "insecure_ssl": "0"
      }
    };

    const fetchResponse = await this.httpFetch(`https://api.github.com/repos/${repositoryOwner}/${repositoryName}/hooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.github+json",
        "Authorization": `Bearer ${authToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": GITHUB_USER_AGENT,
      },
      body: JSON.stringify(webhookPayload),
    });

    return fetchResponse;
  }

  async createRemoteRepository(
    authToken: string,
    repositoryUserName: string,
    repoName: string,
    isUserRepo: boolean,
    shouldEnablePublicationBranch: boolean
  ): Promise<CreateRemoteRepositoryReturnType> {
    // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#create-an-organization-repository - org repo
    // vs
    // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#create-a-repository-for-the-authenticated-user - user repo

    const payload = {
      "name": repoName,
      "description": "Auto-generated repository to test Dataspecer connection",
      "homepage": "https://github.com",
      "private": false,
      "is_template": false,
      "auto_init": true     // We need this otherwise the repository does not have any branch, which creates a lot of issues
                            // TODO RadStr: Maybe we need it only for the publication repository though
    };

    const restEndpoint = isUserRepo ? "https://api.github.com/user/repos" : `https://api.github.com/orgs/${repositoryUserName}/repos`;

    const fetchResponse = await this.httpFetch(restEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.github+json",
        "Authorization": `Bearer ${authToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Accept": "application/vnd.github+json",
        "User-Agent": GITHUB_USER_AGENT,
      },
      body: JSON.stringify(payload),
    });

    if (fetchResponse.status < 200 || fetchResponse.status >= 300) {
      throw new GitRestApiOperationError(`Error when creating new remote GitHub repository: ${fetchResponse.status} ${fetchResponse}`);
    }

    const responseAsJSON = (await fetchResponse.json()) as any;
    const defaultBranch: string | null = responseAsJSON?.default_branch ?? null;

    if (shouldEnablePublicationBranch) {
      // We have to create the branch first, we can not enable GH pages on not existing branch
      const defaultBranchExplicit = defaultBranch ?? "main";
      const initialCommitHash = await this.getLatestCommit(repositoryUserName, repoName, defaultBranchExplicit, authToken);
      await this.createBranch(repositoryUserName, repoName, PUBLICATION_BRANCH_NAME, initialCommitHash, authToken);

      const pagesResponse = await this.enableGitHubPages(repoName, repositoryUserName, PUBLICATION_BRANCH_NAME, authToken);
      // TODO RadStr Debug: Debug prints
      // console.info({pagesResponse});
      // console.info({json: await pagesResponse.json()});
    }

    return {
      response: fetchResponse,
      defaultBranch,
    };
  }



  private async getLatestCommit(repositoryUserName: string, repoName: string, branch: string, authToken: string) {
    const mainRefUrl = `https://api.github.com/repos/${repositoryUserName}/${repoName}/git/ref/heads/${branch}`;

    const fetchResponse = await this.httpFetch(mainRefUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (fetchResponse.status < 200 || fetchResponse.status >= 300) {
      throw new GitRestApiOperationError(`Error when getting the latest commit of GitHub repository: ${fetchResponse.status} ${fetchResponse}`);
    }

    const responseAsJSON = (await fetchResponse.json()) as any;
    const latestCommitHash = responseAsJSON.object.sha;
    return latestCommitHash;
  }

  private async createBranch(repositoryUserName: string, repoName: string, branch: string, latestCommitHash: string, authToken: string) {
    const createRefUrl = `https://api.github.com/repos/${repositoryUserName}/${repoName}/git/refs`;

    const fetchResponse = await this.httpFetch(createRefUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: latestCommitHash,
      }),
    });

    if (fetchResponse.status < 200 || fetchResponse.status >= 300) {
      throw new GitRestApiOperationError(`Error when creating branch of GitHub repository: ${fetchResponse.status} ${fetchResponse}`);
    }

    return fetchResponse;
  }

  getBotCredentials(): GitCredentials | null {
    const accessTokens: AccessToken[] = [];
    const githubConfiguration = this.authenticationGitProviderData.gitBotConfiguration;

    if (githubConfiguration?.dsBotSSHId !== undefined) {
      accessTokens.push({
        isBotAccessToken: true,
        type: AccessTokenType.SSH,
        value: githubConfiguration.dsBotSSHId,
      });
    }
    if (githubConfiguration?.dsBotAbsoluteGitProviderControlToken !== undefined) {
      accessTokens.push({
        isBotAccessToken: true,
        type: AccessTokenType.PAT,
        value: githubConfiguration.dsBotAbsoluteGitProviderControlToken,
      });
    }

    if (accessTokens.length === 0 || githubConfiguration?.dsBotUserName === undefined || githubConfiguration?.dsBotEmail === undefined) {
      return null;
    }

    return {
      name: githubConfiguration.dsBotUserName,
      isBotName: true,
      email: githubConfiguration.dsBotEmail,
      isBotEmail: true,
      accessTokens,
    };
  }

  async setBotAsCollaborator(repositoryUserName: string, repoName: string, accessToken: string): Promise<FetchResponse> {
    // We have to actually perform 2 steps:
    //  1) Add the collaborator
    //  2) The collaborator has to accept the invitation


    // Adding collaborator
    // https://docs.github.com/en/rest/collaborators/collaborators?apiVersion=2022-11-28#add-a-repository-collaborator
    const botCredentials = this.getBotCredentials();
    if (botCredentials === null) {
      throw new Error("Name of bot is not defined, we can not add him as a collaborator to repository");
    }

    const restEndPointToAddCollaborator = `https://api.github.com/repos/${repositoryUserName}/${repoName}/collaborators/${botCredentials.name}`;

    // TODO RadStr: Maybe better permissions - or also could specify them in given method arguments
    const payload = {
      permission: "push",
    };

    const addingCollaboratorFetchResponse = this.httpFetch(restEndPointToAddCollaborator, {
      method: "PUT",
      headers: {
        "Content-Type": "application/vnd.github+json",
        "Authorization": `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Accept": "application/vnd.github+json",
        "User-Agent": GITHUB_USER_AGENT,
      },
      body: JSON.stringify(payload),
    });

    // TODO RadStr: Already doing this somewhere else + maybe there is mechanism how are these things solved in Dataspecer
    const addingCollaboratorFetchResponseAwaited = await addingCollaboratorFetchResponse;
    if (addingCollaboratorFetchResponseAwaited.status < 200 || addingCollaboratorFetchResponseAwaited.status > 299) {
      console.error("Could not add bot as a collaborator", addingCollaboratorFetchResponseAwaited);
      return addingCollaboratorFetchResponse;
    }

    const addingCollaboratorResponseAsJSON = await addingCollaboratorFetchResponseAwaited.json();
    const invitationIdentifier = (addingCollaboratorResponseAsJSON as any)?.["id"];

    // Accepting invitation
    // https://docs.github.com/en/rest/collaborators/invitations?apiVersion=2022-11-28#accept-a-repository-invitation
    const botAccessToken = findPatAccessToken(botCredentials.accessTokens);
    if (botAccessToken === null) {
      throw new Error("There is not defined bot access token, so bot can not accept collaborator invitation");
    }
    const acceptInvitationRestEndpoint = `https://api.github.com/user/repository_invitations/${invitationIdentifier}`;

    const acceptInvitationFetchResponse = this.httpFetch(acceptInvitationRestEndpoint, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${botAccessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Accept": "application/vnd.github+json",
        "User-Agent": GITHUB_USER_AGENT,
      },
    });

    return acceptInvitationFetchResponse;
  }

  async setRepositorySecret(repositoryUserName: string, repoName: string, accessToken: string, secretKey: string, secretValue: string): Promise<FetchResponse> {
    // Get public key for encryption - https://docs.github.com/en/rest/actions/secrets?apiVersion=2022-11-28#get-a-repository-public-key
    const restEndpointForPublicKey = `https://api.github.com/repos/${repositoryUserName}/${repoName}/actions/secrets/public-key`;

    const publicKeyResponse = this.httpFetch(restEndpointForPublicKey, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Accept": "application/vnd.github+json",
        "User-Agent": GITHUB_USER_AGENT,
      },
    });

    const publicKeyResponseValue = await publicKeyResponse;

    if (publicKeyResponseValue.status < 200 || publicKeyResponseValue.status > 299) {
      console.error("Not 2** status when fetching public key to store encrypted value of secret");
      return publicKeyResponse;
    }

    const publicKeyJSONResponse = await publicKeyResponseValue.json();



    const publicKey = (publicKeyJSONResponse as any)?.["key"];
    const publicKeyIdentifier = (publicKeyJSONResponse as any)?.["key_id"];

    if (publicKey === undefined || publicKeyIdentifier === undefined) {
      console.error("Can't fetch public key values from repository, so we can't store encrypted value of secret");
      return publicKeyResponse;
    }

    // Encrypt
    // Based on https://docs.github.com/en/rest/guides/encrypting-secrets-for-the-rest-api?apiVersion=2022-11-28#example-encrypting-a-secret-using-nodejs
    await sodium.ready;

    // Convert the secret and key to a Uint8Array.
    const binaryKey = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
    const binarySecret = sodium.from_string(secretValue);

    // Encrypt the secret using libsodium
    const encryptedBytes = sodium.crypto_box_seal(binarySecret, binaryKey);

    // Convert the encrypted Uint8Array to Base64
    const encryptedSecretValue = sodium.to_base64(encryptedBytes, sodium.base64_variants.ORIGINAL);


    // Store the encrypted secret
    // https://docs.github.com/en/rest/actions/secrets?apiVersion=2022-11-28#create-or-update-a-repository-secret
    const restEndPoint = `https://api.github.com/repos/${repositoryUserName}/${repoName}/actions/secrets/${secretKey}`;

    const payload = {
      encrypted_value: encryptedSecretValue,
      key_id: publicKeyIdentifier
    };

    const fetchResponse = this.httpFetch(restEndPoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/vnd.github+json",
        "Authorization": `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Accept": "application/vnd.github+json",
        "User-Agent": GITHUB_USER_AGENT,
      },
      body: JSON.stringify(payload),
    });

    return fetchResponse;
  }

  /**
   * @deprecated We put the GitHub pages on the same repository instead of onto separate publication repository
   */
  async createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryUserName?: string, accessToken?: string): Promise<FetchResponse> {
    const botCredentials = this.getBotCredentials();
    if (botCredentials === null) {
      throw new Error("Can not create publication repository, since there are no bot credentials");
    }
    const botAccessToken = findPatAccessToken(botCredentials.accessTokens)?.value;

    repositoryUserName = repositoryUserName ?? botCredentials.name;
    accessToken = accessToken ?? (botAccessToken ?? undefined);
    if (accessToken === undefined) {
      throw new Error("Can not create publication repository, since there is no access token - neiter from user and from bot");
    }

    await this.createRemoteRepository(accessToken, repositoryUserName, repoName, isUserRepo, false);
    await this.setBotAsCollaborator(repositoryUserName, repoName, accessToken);
    return this.enableGitHubPages(repoName, repositoryUserName, "main", accessToken);
  }

  getWorkflowFilesDirectoryName(): string {
    return ".github";
  }

  isGitProviderDirectory(fullPath: string): boolean {
    return fullPath.endsWith(".github");
  }


  /**
   * Enables GitHub pages for given repository.
   * @todo This is not part of GitProvider - maybe could be in future - We don't know details of other providers to decide if it should be
   */
  async enableGitHubPages(repoName: string, repositoryUserName: string, branch: string, accessToken: string): Promise<FetchResponse> {
    // https://docs.github.com/en/rest/pages/pages?apiVersion=2022-11-28#create-a-github-pages-site
    const payload = {
      source: {
        branch: branch,
        path: "/" // Can be / or /docs - it is where are the pages' source stored
      }
    };

    const restEndPoint = `https://api.github.com/repos/${repositoryUserName}/${repoName}/pages`;
    const fetchResponse = this.httpFetch(restEndPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Accept": "application/vnd.github+json",
        "User-Agent": GITHUB_USER_AGENT,
      },
      body: JSON.stringify(payload),
    });

    return fetchResponse;
  }


  async getDefaultBranch(repositoryURL: string): Promise<string | null> {
    const repo = this.extractPartOfRepositoryURL(repositoryURL, "repository-name");
    const owner = this.extractPartOfRepositoryURL(repositoryURL, "user-name");     // TODO RadStr: Rename user to owner everywhere
    const restEndPointForRepo = `https://api.github.com/repos/${owner}/${repo}`;

    const response = await this.httpFetch(restEndPointForRepo, {
      method: "GET",
      headers: {
        "User-Agent": GITHUB_USER_AGENT,
      },
    });

    const responseAsJSON = (await response.json()) as any;
    const defaultBranch = responseAsJSON?.default_branch ?? null;

    return defaultBranch;
  }

  extractCommitReferenceValueFromRepositoryURLSplit(repositoryURLSplit: string[], _commitReferenceType: CommitReferenceType): string | null {
    if (repositoryURLSplit.length < 4 || repositoryURLSplit.at(-2) !== "tree") {
      return null;
    }

    return repositoryURLSplit.at(-1)!;
  }


  protected getZipDownloadLink(owner: string, repo: string, commitName: string, commitReferenceType: CommitReferenceType): string {
    let urlPartBasedOnCommitReferenceType: string;
    switch (commitReferenceType) {
      case "commit":
        urlPartBasedOnCommitReferenceType = "";
        break;
      case "branch":
        urlPartBasedOnCommitReferenceType = "refs/heads/";
        break;
      case "tag":
        urlPartBasedOnCommitReferenceType = "tags/";
        break;
      default:
        throw new Error(`Invalid commit type: ${commitReferenceType}. Probably programmer error`);
    }
    const zipURL = `https://github.com/${owner}/${repo}/archive/${urlPartBasedOnCommitReferenceType}${commitName}.zip`;
    return zipURL;
  }

  createGitRepositoryURL(userName: string, repoName: string, gitRef?: GitRef): string {
    let branchSuffix: string = "";
    if (gitRef !== undefined) {
      if (gitRef.type === "branch") {
        branchSuffix = `/tree/${gitRef.name}`;
      }
      else if (gitRef.type === "commit") {
        branchSuffix = `/commit/${gitRef.sha}`;
      }
    }
    const url = `${this.getDomainURL(true)}/${userName}/${repoName}${branchSuffix}`;
    return url;
  }

  extractDefaultRepositoryUrl(repositoryUrl: string): string {
    const domain = this.extractPartOfRepositoryURL(repositoryUrl, "url-domain");
    const owner = this.extractPartOfRepositoryURL(repositoryUrl, "user-name");
    const repositoryName = this.extractPartOfRepositoryURL(repositoryUrl, "repository-name");
    if (domain === null) {
      throw new Error("Invalid domain in" + repositoryUrl);
    }
    else if (owner === null) {
      throw new Error("Invalid owner in" + repositoryUrl);
    }
    else if (repositoryName === null) {
      throw new Error("Invalid repositoryName in" + repositoryUrl);
    }

    return "https://" + domain + "/" + owner + "/" + repositoryName;
  }

  public static convertGenericScopeToProviderScopeStatic(scope: Scope): GitHubScope[] {
    switch(scope) {
      case "userInfo":
        return ["read:user"];
      case "email":
        return ["user:email"];
      case "publicRepo":
        return ["public_repo"];
      case "workflow":
        return ["workflow"];
      case "deleteRepo":
        return ["delete_repo"];
      default:
        throw new Error("Unknown scope.");
    }
  }

  convertGenericScopeToProviderScope(scope: Scope): GitHubScope[] {
    return GitHubProvider.convertGenericScopeToProviderScopeStatic(scope);
  }

  public static convertProviderScopeToGenericScopeStatic(scope: GitHubScope): Scope {
    switch(scope) {
      case "read:user":
        return "userInfo";
      case "user:email":
        return "email";
      case "public_repo":
        return "publicRepo";
      case "workflow":
        return "workflow";
      case "delete_repo":
        return "deleteRepo";
      default:
        throw new Error("Unknown scope.");
    }
  }

  convertProviderScopeToGenericScope(scope: GitHubScope): Scope {
    return GitHubProvider.convertProviderScopeToGenericScopeStatic(scope);
  }

  async revokePAT(personalAccessToken: string): Promise<FetchResponse> {
    if (this.authenticationGitProviderData.authConfiguration === undefined) {
      // Probably not needed, we can probably just always use ! instead, it should be always defined if we call this method
      // But revoking is called rarely, so it is better to just be safe
      throw new Error("Can not revoke PAT since the auth configuration is not defined")
    }

    // Generated by ChatGPT after being fed this page https://docs.github.com/en/rest/apps/oauth-applications?apiVersion=2022-11-28#delete-an-app-token
    const url = `https://api.github.com/applications/${this.authenticationGitProviderData.authConfiguration.gitHubAuthClientId}/token`;

    const response = await this.httpFetch(url, {
      method: "DELETE",
      headers: {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Authorization": "Basic " + Buffer.from(`${this.authenticationGitProviderData.authConfiguration.gitHubAuthClientId}:${this.authenticationGitProviderData.authConfiguration.gitHubAuthClientSecret}`).toString("base64"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        access_token: personalAccessToken,
      }),
    });

    return response;
  }
}
