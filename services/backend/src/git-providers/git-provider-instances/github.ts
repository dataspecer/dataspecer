import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import { FetchResponse } from "@dataspecer/core/io/fetch/fetch-api";

import { GIT_RAD_STR_BOT_EMAIL, GIT_RAD_STR_BOT_USERNAME, GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN } from "../../git-never-commit.ts";
import { GITHUB_USER_AGENT } from "../../utils/git-utils.ts";

import fs from "fs";

// Using this one since I could not make the ones for nodeJS (one is not using ES modules and the other one seems to be too old and correctly support types)
import sodium from "libsodium-wrappers-sumo";
import { GitProvider, GitProviderEnum, gitProviderDomains, WebhookRequestDataProviderIndependent, GitCredentials, createLinksForFiles } from "../git-provider-api.ts";

// Note:
// Even though the request usually work without, the docs demand to specify User-Agent in headers for REST API requests
// https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api?apiVersion=2022-11-28#user-agent

export class GitHubProvider implements GitProvider {
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
        "Accept": "application/vnd.github+json",
        "User-Agent": GITHUB_USER_AGENT,
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
        "Accept": "application/vnd.github+json",
        "User-Agent": GITHUB_USER_AGENT,
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
}