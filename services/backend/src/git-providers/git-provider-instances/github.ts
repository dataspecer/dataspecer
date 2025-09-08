import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import { FetchResponse } from "@dataspecer/core/io/fetch/fetch-api";

import { GIT_RAD_STR_BOT_EMAIL, GIT_RAD_STR_BOT_SSH_ID, GIT_RAD_STR_BOT_USERNAME, GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN } from "../../git-never-commit.ts";
import { GITHUB_USER_AGENT } from "../../utils/git-utils.ts";

import fs from "fs";

// Using this one since I could not make the ones for nodeJS (one is not using ES modules and the other one seems to be too old and correctly support types)
import sodium from "libsodium-wrappers-sumo";
import { CommitReferenceType, createRemoteRepositoryReturnType, CommitterInfo, GitProviderEnum, Scope, WebhookRequestDataProviderIndependent, GitCredentials, AccessToken, AccessTokenType } from "@dataspecer/git";
import { GitProviderBase } from "../git-provider-base.ts";
import { resourceModel } from "../../main.ts";
import { createLinksForFiles, gitProviderDomains } from "../git-provider-factory.ts";
import { findPatAccessToken } from "../../routes/create-package-git-link.ts";

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

  async extractDataForWebhookProcessing(webhookPayload: any): Promise<WebhookRequestDataProviderIndependent | null> {
    // https://docs.github.com/en/webhooks/webhook-events-and-payloads#push

    // TODO RadStr: Taking more data since I might use some of them in future

    // TODO: Currently without branches
    const beforeCommit = webhookPayload.before;
    const afterCommit = webhookPayload.after;
    const refPrefix = "refs/heads/";
    const branch = webhookPayload.ref.substring(refPrefix.length);
    const repoName = webhookPayload.repository.name;
    const repoURL = webhookPayload.repository.html_url;
    const resourceToUpdateInWebhook = await resourceModel.getResourceForGitUrlAndBranch(repoURL, branch);

    const iri = resourceToUpdateInWebhook?.iri;
    if (iri === undefined) {
      // This means that new branch was added to git, but the branch does not have equivalent in the DS
      // TODO RadStr: We could create new package automatically, but I am not sure if we want that
      return null;
    }

    const gitURL = webhookPayload.repository.git_url;
    const cloneURL = webhookPayload.repository.clone_url;
    const commits = webhookPayload.commits;
    // Head commit
    const lastCommit = webhookPayload.head_commit;
    const { id: lastId, tree_id: lastTreeId, url: lastUrl, added, removed, modified } = lastCommit;

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
    const fetchResponse = httpFetch(`https://api.github.com/repos/${repositoryUserName}/${repoName}`, {
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

    const fetchResponse = await httpFetch(`https://api.github.com/repos/${repositoryOwner}/${repositoryName}/hooks`, {
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

  async createRemoteRepository(authToken: string, repositoryUserName: string, repoName: string, isUserRepo: boolean): Promise<createRemoteRepositoryReturnType> {
    // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#create-an-organization-repository - org repo
    // vs
    // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#create-a-repository-for-the-authenticated-user - user repo

    // TODO RadStr: REMOVE THIS !!! (even though it really does not matter since user can't access server logs)
    // console.info("create remote repo USING", authToken, repositoryUserName, repoName);
    // console.info("BOT PAT TOKEN is as follows", GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN);

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

    const fetchResponse = await httpFetch(restEndpoint, {
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
      throw new Error(`Error when creating new remote GitHub repository: ${fetchResponse.status} ${fetchResponse}`);
    }

    const responseAsJSON = (await fetchResponse.json()) as any;
    const defaultBranch: string | null = responseAsJSON?.default_branch ?? null;
    return {
      response: fetchResponse,
      defaultBranch,
    };
  }

  getBotCredentials(): GitCredentials | null {
    const accessTokens: AccessToken[] = [];

    if (GIT_RAD_STR_BOT_SSH_ID !== undefined) {
      accessTokens.push({
        isBotAccessToken: true,
        type: AccessTokenType.SSH,
        value: GIT_RAD_STR_BOT_SSH_ID,
      });
    }
    if (GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN !== undefined) {
      accessTokens.push({
        isBotAccessToken: true,
        type: AccessTokenType.PAT,
        value: GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN,
      });
    }

    if (accessTokens.length === 0 || GIT_RAD_STR_BOT_USERNAME === undefined || GIT_RAD_STR_BOT_EMAIL === undefined) {
      return null;
    }

    return {
      name: GIT_RAD_STR_BOT_USERNAME,
      isBotName: true,
      email: GIT_RAD_STR_BOT_EMAIL,
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

    const addingCollaboratorFetchResponse = httpFetch(restEndPointToAddCollaborator, {
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

    const acceptInvitationFetchResponse = httpFetch(acceptInvitationRestEndpoint, {
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

    const publicKeyResponse = httpFetch(restEndpointForPublicKey, {
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

    // TODO RadStr: Maybe better permissions - or also could specify them in given method arguments
    const payload = {
      encrypted_value: encryptedSecretValue,
      key_id: publicKeyIdentifier
    };

    const fetchResponse = httpFetch(restEndPoint, {
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

  async createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryUserName?: string, accessToken?: string): Promise<FetchResponse> {
    const botCredentials = this.getBotCredentials();
    if (botCredentials === null) {
      throw new Error("Can not create publication repository, since there are no bot credentials");
    }
    const botAccessToken = findPatAccessToken(botCredentials.accessTokens);

    repositoryUserName = repositoryUserName ?? botCredentials.name;
    accessToken = accessToken ?? (botAccessToken ?? undefined);
    if (accessToken === undefined) {
      throw new Error("Can not create publication repository, since there is no access token - neiter from user and from bot");
    }

    await this.createRemoteRepository(accessToken, repositoryUserName, repoName, isUserRepo);
    await this.setBotAsCollaborator(repositoryUserName, repoName, accessToken);
    return this.enableGitHubPages(repoName, repositoryUserName, accessToken)
  }

  copyWorkflowFiles(copyTo: string): void {
    const workflowsDirPath = `${copyTo}/.github/workflows`;
    if(!fs.existsSync(workflowsDirPath)) {
      fs.mkdirSync(workflowsDirPath, { recursive: true });
    }

    createLinksForFiles("./git-workflows/github/workflows", workflowsDirPath);
  }

  isGitProviderDirectory(fullPath: string): boolean {
    return fullPath.endsWith(".github");
  }

  // TODO RadStr: This is not part of GitProvider - maybe could be in future - I don't know what other providers exists, etc.
  /**
   * Enables GitHub pages for given repository.
   */
  async enableGitHubPages(repoName: string, repositoryUserName: string, accessToken: string): Promise<FetchResponse> {
    // https://docs.github.com/en/rest/pages/pages?apiVersion=2022-11-28#create-a-github-pages-site

    const restEndPoint = `https://api.github.com/repos/${repositoryUserName}/${repoName}/pages`;

    // TODO RadStr: Maybe better permissions - or also could specify them in given method arguments
    const payload = {
      source: {
        branch: "main",
        path: "/" // Can be / or /docs - it is where are the pages' source stored
      }
    };

    const fetchResponse = httpFetch(restEndPoint, {
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


    // const fetchResponse = httpFetch(restEndPoint, {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${accessToken}`,
    //     "X-GitHub-Api-Version": "2022-11-28",
    //     "Accept": "application/vnd.github+json",
    //     "User-Agent": GITHUB_USER_AGENT,
    //   },
    // });


    // TODO RadStr: Debug print
    // console.info("enableGitHubPages fetchResponse:", await fetchResponse);

    return fetchResponse;
  }


  async getDefaultBranch(repositoryURL: string): Promise<string | null> {
    const repo = this.extractPartOfRepositoryURL(repositoryURL, "repository-name");
    const owner = this.extractPartOfRepositoryURL(repositoryURL, "user-name");     // TODO RadStr: Rename user to owner everywhere
    const restEndPointForRepo = `https://api.github.com/repos/${owner}/${repo}`;

    const response = await httpFetch(restEndPointForRepo, {
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

  createGitRepositoryURL(userName: string, repoName: string, branch?: string): string {
    const branchSuffix = branch === undefined ? "" : `/tree/${branch}`;
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
}