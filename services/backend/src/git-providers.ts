// TODO RadStr: Turn into directory - 1 file for each provider

import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import { FetchResponse } from "@dataspecer/core/io/fetch/fetch-api";

import express from "express";
import { GIT_RAD_STR_BOT_EMAIL, GIT_RAD_STR_BOT_USERNAME, GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN, GITLAB_MFF_PERSONAL_API_CONTROL_TOKEN } from "./git-never-commit.ts";

import fs from "fs";

// Using this one since I could not make the ones for nodeJS (one is not using ES modules and the other one seems to be too old and correctly support types)
import sodium from "libsodium-wrappers-sumo";

export type GitCredentials = {
  name: string,
  email: string,
  accessToken: string,
}

// TODO RadStr: Always keep the webhook-test (respectively the part of url after /)
export const WEBHOOK_HANDLER_URL = "https://d8be2f9e58e2.ngrok-free.app/webhook-test";

export enum GitProviderEnum {
  GitHub,
  GitLab,
}

/**
 * TODO RadStr: Maybe there is a better name?
 */
type WebhookRequestProviderSpecificData = {
  gitProvider: GitProvider,
  webhookPayload: object,
};

/**
 * TODO RadStr: Maybe there is a better name?
 * TODO RadStr: Also the repoName/iri might not be needed in future
 */
export type WebhookRequestDataProviderIndependent = {
  cloneURL: string,
  commits: object[],
  repoName: string,
  iri: string,
}

export abstract class GitProviderFactory {
  static createGitProviderFromWebhookRequest(request: express.Request): WebhookRequestProviderSpecificData {
    // TODO RadStr: Debug print
    // console.info("Request body", request.body);

    if (request.body !== undefined && request.body.payload === undefined) {
      return {
        gitProvider: new GitLabProvider(),
        webhookPayload: request.body,
      }
    }
    else if (request?.body?.payload !== undefined) {
      return {
        gitProvider: new GitHubProvider(),
        webhookPayload: JSON.parse(request.body.payload),
      }
    }
    else {
      // TODO RadStr: Maybe better error handling
      throw new Error(`The given request from webhook is not of any known git provider. Request: ${request}`);
    }
  }

  /**
   * @param domainURL if not specified then the default one for the provider is used. for example in case of gitlab it is gitlab.com.
   *  So this domainURL needs to be provided only if we are using some specific provider - like gitlab.mff.cuni.cz
   * @returns
   */
  static createGitProvider(gitProviderName: GitProviderEnum, domainURL?: string): GitProvider {
    switch(gitProviderName) {
      case GitProviderEnum.GitHub:
        return new GitHubProvider();
      case GitProviderEnum.GitLab:
        return new GitLabProvider(domainURL);
      default:
        // TODO: Or maybe return default implementation, which does not do anything
        console.error(`${gitProviderName} does not exist. You forgot to extend GitProviderFactory`);
        throw new Error(`${gitProviderName} does not exist. You forgot to extend GitProviderFactory`);
    }
  }

  /**
   *
   * @param repositoryURL It is enough the for the repositoryURL to contain just the hostname part.
   */
  static createGitProviderFromRepositoryURL(repositoryURL: string): GitProvider {
    const gitProvider = getMainGitProviderFromRepositoryURL(repositoryURL);
    if (gitProvider === null) {
      // TODO: Better error handling
      throw new Error(`Git provider form given URL ${repositoryURL} does not exist.`);
    }
    const domainURL = extractPartOfRepositoryURL(repositoryURL, "url-domain") ?? undefined;
    return GitProviderFactory.createGitProvider(gitProvider, domainURL);
  }
}

// TODO: What about https://gitlab.mff.cuni.cz ???
/**
 * Maps the provider to the base URL domain.
 */
export const gitProviderDomains: Readonly<Record<GitProviderEnum, string>> = {
  [GitProviderEnum.GitHub]: "github.com",
  [GitProviderEnum.GitLab]: "gitlab.com",
};

/**
 * This expects known git provider, but I noticed that there are possibly more providers per one provider
 * @deprecated This works, but I noticed that there are more git providers within some spaces. For example there is only one GitHub
 *  but in case of gitlab, we can have self-hosted instances, for example our faculty uses https://gitlab.mff.cuni.cz,
 *  so there is not single gitlab URL for every organization.
 */
export const createGitRepositoryURLForKnownProviders = (gitProvider: GitProviderEnum, userName: string, repoName: string, branch?: string): string => {
  const baseURL = gitProviderDomains[gitProvider];
  const branchSuffix = branch === undefined ? "" : `/tree/${branch}`;
  const url = `https://${baseURL}/${userName}/${repoName}${branchSuffix}`;
  return url;
};

/**
 * @param gitProviderURL the URL of git provider, shoul end with /, for example "https://gitlab.com/" or "https://github.com/"
 * @returns The URL, which looks like {@link gitProviderURL}/{@link userName}/{@link repoName}/tree/{@link branch}.
 *  Where the last part tree/... is only when branch is defined, otherwise it is not in result (which means we are returning main branch).
 */
export const createGitRepositoryURL = (gitProviderURL: string, userName: string, repoName: string, branch?: string): string => {
  // TODO RadStr: Well gitlab once again has it different it has /-/ between the repoName and tree,
  //              BUT it seems to work without it, so maybe it is not needed
  const branchSuffix = branch === undefined ? "" : `/tree/${branch}`;
  const url = `${gitProviderURL}${userName}/${repoName}${branchSuffix}`;
  return url;
};


/**
 *
 * @param repositoryURL It is enough the for the repositoryURL to contain just the hostname part.
 * @returns the main provider of the repository, so for example if the URL looks like "https://gitlab.com/...", then main provider is gitlab,
 *  but also when it looks like "https://gitlab.my.org.com/..."
 */
export const getMainGitProviderFromRepositoryURL = (repositoryURL: string): GitProviderEnum | null => {
  const parsedUrl = new URL(repositoryURL);

  if (parsedUrl.hostname === "github.com") {
    return GitProviderEnum.GitHub;
  }
  else if (parsedUrl.hostname.startsWith("gitlab.")) {
    return GitProviderEnum.GitLab;
  }

  return null;
};

/**
 * @param repositoryURL is the URL of repository.
 * @returns The Git provider part of url, that is for example "github.com" or "gitlab.com" or "gitlab.my.org.com"
 */
export const getGitProviderURLPartFromRepositoryURL = (repositoryURL: string): string => {
  const parsedUrl = new URL(repositoryURL);
  return parsedUrl.hostname;
};

export interface GitProvider {
  /**
   * Returns the provider enum value for this provider.
   */
  getGitProviderEnumValue(): GitProviderEnum;

  /**
   * Returns the domain URL for this instance. For example for github is is "github.com". But for GitLab we can have different domains:
   *  "gitlab.com" or "gitlab.mff.cuni.cz"
   */
  getDomainURL(): string;

  /**
   * Sets the new domain URL for this instance. For example GitHub does nothing on this call. But for GitLab we can have different domains:
   *  "gitlab.com" or gitlab.mff.cuni.cz
   * @param newDomainURL is the new domain URL
   */
  setDomainURL(newDomainURL: string): void;

  /**
   *
   */
  /**
   * Extracts data for further processing from the {@link webhookPayload} of the webhook.
   * We have to separate it, because unfortunately each provider has slightly different format of the payload.
   * So we just pick the data we need and return them.
   * @param request is the original data from request as it came in webhook converted to JSON.
   */
  extractDataForWebhookProcessing(webhookPayload: any): WebhookRequestDataProviderIndependent | null;

  // TODO RadStr: Maybe everywhere use repository instead of repositoryUserName
  /**
   * Creates remote git repository with following URL .../{@link repositoryUserName}/{@link repoName}.
   * @param authToken has to contain right to create (public) repository
   * @param isUserRepo if true then we create repository under user of name {@link repositoryUserName},
   *  if false then we are creating repository under organization of name {@link repositoryUserName}.
   */
  createRemoteRepository(authToken: string, repositoryUserName: string, repoName: string, isUserRepo: boolean): Promise<FetchResponse>;

  /**
   * Removes remote git repository with following URL .../{@link repositoryUserName}/{@link repoName}.
   * @param authToken has to contain right to remove (public) repository
   */
  removeRemoteRepository(authToken: string, repositoryUserName: string, repoName: string): Promise<FetchResponse>;

  // TODO RadStr: Mozna vybrat jen podmnozinu a dat ji do enumu nebo nekam a pak vytvaret mapovani dle GitProvidera, ty requesty vypadaji ze ma kazdy jiny
  // TODO RadStr: ... asi jo
  /**
   * Creates webhook for repository with the following URL: .../{@link repositoryOwner}/{@link repositoryName}.
   *   The webhook works for given {@link webhookEvents} and is handled on the following {@link webhookHandlerURL}.
   * @param authToken Authorization token with access rights to create repository - for example OAuth token or PAT token
   * @param repositoryOwner is the repository owner - it is used to create the URL of the repository.
   * @param repositoryName is the repository name - it is used to create the URL of the repository.
   * @param webhookHandlerURL is the URL, which will handle the webhook events.
   * @param webhookEvents Names of the events to have webhooks for: For example - push, pull_request in case of GitHub.
   *  List of all available webhooks in GitHub: https://docs.github.com/en/webhooks/webhook-events-and-payloads
   *  For GitLab: https://docs.gitlab.com/user/project/integrations/webhook_events
   * @returns The response from the git provider
   */
  createWebhook(
    authToken: string,
    repositoryOwner: string,
    repositoryName: string,
    webhookHandlerURL: string,
    webhookEvents: string[],
  ): Promise<FetchResponse>;

  /**
   * Returns the bot credentials for the concrete git provider.
   */
  getBotCredentials(): GitCredentials;

  /**
   * Sets default bot for this git provider as a collaborator for given {@link}
   * @param repositoryUserName is the user part of the repository URL - Either name of the organization or of the user.
   * @param repoName is the name of the repository.
   */
  setBotAsCollaborator(repositoryUserName: string, repoName: string, accessToken: string): Promise<FetchResponse>;

  /**
   * Sets the repository secret for URL defined as urlRepoHost/{@link repositoryUserName}/{@link repoName}. Where urlRepoHost is for example github.com
   *  If the secret exists it is changed.
   */
  setRepositorySecret(repositoryUserName: string, repoName: string, accessToken: string, secretKey: string, secretValue: string): Promise<FetchResponse>;

  /**
   * Creates the publication repository. That is the repository to contain the generated artifacts and specifications.
   * This method does under the hood two important actions:
   *  1) Creates the publication repository.
   *  2) Sets bot as a collaborator. This is important, since the bot will be the one, which will push to the created publication repo.
   *     We have to do this, because the access tokens for the users are temporary, while this one is "permanent" (we can from time to time generate new one and set environment variables with it).
   *  3) Enable GitHub pages (or some other equivalent for different git providers)
   *
   * @param repoName is the name of the repository, which contains publications
   * @param isUserRepo if true then it is repo created under user, if false it is created under organization
   * @param repositoryUserName is the name of the organization if {@link isUserRepo} is false, or name of user if it is true.
   *  If not provided then bot is used as a user and the {@link isUserRepo} is ignored (it is expected to be true).
   * @param accessToken if not given, the bot access token is used.
   */
  createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryUserName?: string, accessToken?: string): Promise<FetchResponse>;

  /**
   * Copies (or rather create file links, but the end effect is same, we just safe space and actions on hard drive)
   *  the workflow files (that is for example in case of GitHub the GitHub actions) to the {@link targetPackageIRI}.
   *  Note that it is package, since the full path is based on both the {@link targetPackageIRI} and the gitProvider.
   */
  copyWorkflowFiles(targetPackageIRI: string): void;

  /**
   * @returns True if the given {@link fullpath} is path to directory containing the git provider specific files (like workflow files). False otherwise.
   */
  isGitProviderDirectory(fullPath: string): boolean;
}

class GitHubProvider implements GitProvider {
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

  getDomainURL(): string {
    return gitProviderDomains[this.getGitProviderEnumValue()];
  }

  setDomainURL(newDomainURL: string): void {
    // EMPTY - GitHub has only one domain
  }

  extractDataForWebhookProcessing(webhookPayload: any): WebhookRequestDataProviderIndependent | null {
    // TODO RadStr: Taking more data since I might use some of them in future

    // TODO: Currently without branches
    const beforeCommit = webhookPayload.before;
    const afterCommit = webhookPayload.after;
    const gitRefHead = webhookPayload.ref;
    const repoName = webhookPayload.repository.name;
    // TODO: In future I will find it through the URL inside the prisma database instead
    const iri = String(repoName);
    if (iri === undefined) {
      console.error("For some reason the webhook can't look up iri of package");
      return null;
    }

    const repoURL = webhookPayload.repository.html_url;
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
        "Accept": "application/vnd.github+json"
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
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify(webhookPayload),
    });

    return fetchResponse;
  }

  async createRemoteRepository(authToken: string, repositoryUserName: string, repoName: string, isUserRepo: boolean): Promise<FetchResponse> {
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

    const fetchResponse = httpFetch(restEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.github+json",
        "Authorization": `Bearer ${authToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Accept": "application/vnd.github+json"
      },
      body: JSON.stringify(payload),
    });

    return fetchResponse;
  }

  getBotCredentials(): GitCredentials {
    return {
      name: GIT_RAD_STR_BOT_USERNAME,
      email: GIT_RAD_STR_BOT_EMAIL,
      accessToken: GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN,
    };
  }

  async setBotAsCollaborator(repositoryUserName: string, repoName: string, accessToken: string): Promise<FetchResponse> {
    // We have to actually perform 2 steps:
    //  1) Add the collaborator
    //  2) The collaborator has to accept the invitation


    // Adding collaborator
    // https://docs.github.com/en/rest/collaborators/collaborators?apiVersion=2022-11-28#add-a-repository-collaborator

    const restEndPointToAddCollaborator = `https://api.github.com/repos/${repositoryUserName}/${repoName}/collaborators/${GIT_RAD_STR_BOT_USERNAME}`;

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
        "Accept": "application/vnd.github+json"
      },
      body: JSON.stringify(payload),
    });

    // TODO RadStr: Already doing this somewhere else + maybe there is mechanism how are these things solved in Dataspecer
    const addingCollaboratorFetchResponseAwaited = await addingCollaboratorFetchResponse;
    if (addingCollaboratorFetchResponseAwaited.status < 200 || addingCollaboratorFetchResponseAwaited.status > 299) {
      console.error("Could not add bot as a collaborator");
      return addingCollaboratorFetchResponse;
    }

    const addingCollaboratorResponseAsJSON = await addingCollaboratorFetchResponseAwaited.json();
    const invitationIdentifier = (addingCollaboratorResponseAsJSON as any)?.["id"];

    // Accepting invitation
    // https://docs.github.com/en/rest/collaborators/invitations?apiVersion=2022-11-28#accept-a-repository-invitation
    const botAccessToken = this.getBotCredentials().accessToken;
    const acceptInvitationRestEndpoint = `https://api.github.com/user/repository_invitations/${invitationIdentifier}`;

    const acceptInvitationFetchResponse = httpFetch(acceptInvitationRestEndpoint, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${botAccessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Accept": "application/vnd.github+json"
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
        "Accept": "application/vnd.github+json"
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
        "Accept": "application/vnd.github+json"
      },
      body: JSON.stringify(payload),
    });

    return fetchResponse;
  }

  async createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryUserName?: string, accessToken?: string): Promise<FetchResponse> {
    const botCredentials = this.getBotCredentials();
    repositoryUserName = repositoryUserName ?? botCredentials.name;
    accessToken = accessToken ?? botCredentials.accessToken;
    await this.createRemoteRepository(accessToken, repositoryUserName, repoName, isUserRepo);
    await this.setBotAsCollaborator(repositoryUserName, repoName, accessToken);
    return this.enableGitHubPages(repoName, repositoryUserName, accessToken)
  }

  copyWorkflowFiles(targetPackageIRI: string): void {
    const workflowsDirPath = `./test-git-directory2/${targetPackageIRI}/.github/workflows`;
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
        "Accept": "application/vnd.github+json"
      },
      body: JSON.stringify(payload),
    });


    // const fetchResponse = httpFetch(restEndPoint, {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${accessToken}`,
    //     "X-GitHub-Api-Version": "2022-11-28",
    //     "Accept": "application/vnd.github+json"
    //   },
    // });


    // TODO RadStr: Debug print
    // console.info("enableGitHubPages fetchResponse:", await fetchResponse);

    return fetchResponse;
  }
}

class GitLabProvider implements GitProvider {
  ////////////////////////////
  // Fields
  ////////////////////////////

  private domainURL: string;

  ////////////////////////////
  // Constructor
  ////////////////////////////

  constructor(domainURL?: string) {
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
    this.domainURL = newDomainURL
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
    webhookEvents: string[],
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
}


// TODO: Maybe put into utils or some other file

/**
 * Based on code generated from ChatGPT.
 *
 * @param repositoryURL is the URL of the repository
 * @returns The part of given URL. Where the given URL can either be the main page
 *  (for example https://github.com/mff-uk/dataspecer) or some of the branches (for example https://github.com/mff-uk/dataspecer/tree/stable).
 *  Should also work for gitlab or any other git providers following similar URL structure.
 *  In the example mff-uk is "user-name" and dataspecer is "repository-name"
 */
export function extractPartOfRepositoryURL(repositoryURL: string, part: "url-domain" | "repository-name" | "user-name"): string | null {
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

    return null;
  } catch (error) {
    return null;
  }
}



/**
 * Recursively creates links using fs.link. From {@link sourceDirectory} to {@link targetDirectory}
 */
function createLinksForFiles(sourceDirectory: string, targetDirectory: string): void {
  const files = fs.readdirSync(sourceDirectory);
  for (const file of files) {
    const newSourcefullPath = `${sourceDirectory}/${file}`;
    const newTargetFullPath = `${targetDirectory}/${file}`;
    const stats = fs.statSync(newSourcefullPath);
    if (stats.isDirectory()) {
      createLinksForFiles(newSourcefullPath, newTargetFullPath);
    }
    else {
      fs.link(newSourcefullPath, newTargetFullPath, (err) => {console.info("err", err);});
    }
  }
}

// TODO: Can create test later
// export function testExtractRepoNameFromRepositoryURL() {
//   console.info(extractRepoNameFromRepositoryURL("https://github.com/mff-uk/dataspecer/tree/stable"));   // Should equal dataspecer and the actual split should be [ 'mff-uk', 'dataspecer', 'tree', 'stable' ]
//   console.info(extractRepoNameFromRepositoryURL("https://github.com/mff-uk/dataspecer"));               // Should equal dataspecer and the actual split should be [ 'mff-uk', 'dataspecer' ]
// }

