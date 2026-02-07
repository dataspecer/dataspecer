import { FetchResponse } from "@dataspecer/core/io/fetch/fetch-api";
import { Scope } from "./auth.ts";

export const PUBLICATION_BRANCH_NAME: string = "publication-branch";

export type ConvertRepoURLToDownloadZipURLReturnType = {
  zipURL: string,
  commitReferenceValueInfo: ExtractedCommitReferenceValueFromRepositoryURLExplicit,
};

export enum AccessTokenType {
  PAT,
  SSH,
}

export interface AccessToken {
  type: AccessTokenType,
  value: string;
  isBotAccessToken: boolean;
}

export type CommitterInfo = {
  name: string;
  isBotName: boolean;
  email: string;
  isBotEmail: boolean;
};

export type GitCredentials = CommitterInfo & {
  /**
   * Should be sorted by try order - that is the user ones shoudl be first, bot ones last.
   *  Right now there are at most 4 possible authorization to repository types:
   *   1) SSH key for user
   *   2) Access token from OAuth for user (PAT)
   *   3) SSH key for bot
   *   4) Access token from bot (PAT)
   */
  accessTokens: AccessToken[];
};

export type GitRef = { type: "branch"; name: string } | { type: "commit"; sha: string };


export enum GitProviderEnum {
  GitHub,
  GitLab
}

export const gitProviderNames = ["github", "gitlab"] as const;
export type GitProviderNamesAsType = typeof gitProviderNames[number];
export function isGitProviderName(value: unknown): value is GitProviderNamesAsType {
  return typeof value === "string" && gitProviderNames.includes(value as GitProviderNamesAsType);
}

export type GitProviderIndependentWebhookRequestData = {
  cloneURL: string;
  commits: object[];
  repoName: string;
  iri: string;
  branch: string;
};

export type CommitReferenceType = "commit" | "branch" | "tag";

export type RepositoryURLPartBase = "url-domain" | "repository-name" | "repository-owner";
export type RepositoryURLPart = CommitReferenceType | RepositoryURLPartBase;

export function isCommitReferenceType(value: string): value is CommitReferenceType {
  return value === "commit" || value === "branch" || value === "tag";
}

/**
 * Some git providers might change the URL for the zip download based on the type of reference. For example Github - however Github also allows
 *  one uniform type of download url and it treats it like commit. Therefore If the {@link commitReferenceType} is not provided it will default to "commit".
 */
export function getDefaultCommitReferenceTypeForZipDownload(): CommitReferenceType {
  return "commit";
}

export type ExtractedCommitReferenceValueFromRepositoryURL = {
  commitReferenceValue: string | null;
  fallbackToDefaultBranch: boolean;
}

export type ExtractedCommitReferenceValueFromRepositoryURLExplicit = {
  commitReferenceValue: string;
  fallbackToDefaultBranch: boolean;
}

export type CreateRemoteRepositoryReturnType = {
  defaultBranch: string | null,
  response: FetchResponse
}

export type GetResourceForGitUrlAndBranchType = (gitRepositoryUrl: string, branch: string) => Promise<{iri: string} | null>

export interface GitProvider {
  /**
   * Returns the provider enum value for this provider.
   */
  getGitProviderEnumValue(): GitProviderEnum;

  /**
   * Returns the domain URL for this instance. For example for github is is "github.com". But for GitLab we can have different domains:
   *  "gitlab.com" or "gitlab.mff.cuni.cz". If {@link shouldPrefixWithHttps} is set to true, the domain will start with https://, otherwise not
   */
  getDomainURL(shouldPrefixWithHttps: boolean): string;

  /**
   * Sets the new domain URL for this instance. For example GitHub does nothing on this call. But for GitLab we can have different domains:
   *  "gitlab.com" or gitlab.mff.cuni.cz
   * @param newDomainURL is the new domain URL
   */
  setDomainURL(newDomainURL: string): void;

  /**
   * We will just call it GitHub pages in the documentation, since that is our current reference point.
   * @param repositoryUrl takes this argument and returns the Git pages (GitHub pages in case of GitHub) associated with the repository.
   * @returns In case of GitHub this returns the URL of the linked GitHub pages. Note that for custom URLs, this does not return the custom URL.
   *  It however returns the url of the GitHub pages inside of the repository. The URL GitHub's then behaves as redirect to the custom one (at least in GitHub's case).
   */
  getGitPagesURL(repositoryUrl: string): string;

  /**
   * Extracts data for further processing from the {@link webhookPayload} of the webhook.
   * We have to separate it, because unfortunately each provider has slightly different format of the payload.
   * So we just pick the data we need and return them.
   * @param request is the original data from request as it came in webhook converted to JSON.
   * @returns Returns null if new branch was added to git, but the branch does not have equivalent in the DS.
   */
  extractDataForWebhookProcessing(webhookPayload: any, getResourceForGitUrlAndBranch: GetResourceForGitUrlAndBranchType): Promise<GitProviderIndependentWebhookRequestData | null>;

  /**
   * Creates remote git repository with following URL .../{@link repositoryOwner}/{@link repoName}.
   *
   * @param authToken has to contain right to create (public) repository
   * @param isUserRepo if true then we create repository under user of name {@link repositoryOwner},
   *  if false then we are creating repository under organization of name {@link repositoryOwner}.
   * @param shouldEnablePublicationBranch If set to true should also enable the GitHub pages (or its equivalent) in the PUBLICATION_BRANCH_NAME. (but in future it might change if we start using the publication repos again, possible TODO:)
   */
  createRemoteRepository(authToken: string, repositoryOwner: string, repoName: string, isUserRepo: boolean, shouldEnablePublicationBranch: boolean): Promise<CreateRemoteRepositoryReturnType>;

  /**
   * Removes remote git repository with following URL .../{@link repositoryOwner}/{@link repoName}.
   * @param authToken has to contain right to remove (public) repository
   */
  removeRemoteRepository(authToken: string, repositoryOwner: string, repoName: string): Promise<FetchResponse>;

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
   * @todo Once somebody implements for GitLab, it would be ideal to have it in some sort of enum instead of string.
   * @returns The response from the git provider
   */
  createWebhook(
    authToken: string,
    repositoryOwner: string,
    repositoryName: string,
    webhookHandlerURL: string,
    webhookEvents: string[]
  ): Promise<FetchResponse>;

  /**
   * Returns the bot credentials for the concrete git provider.
   */
  getBotCredentials(): GitCredentials | null;

  /**
   * Sets default bot for this git provider as a collaborator for given url identified by {@link repositoryOwner} and {@link repoName}.
   * @todo Currently the bot will have push rights. In future it might be better to allow caller to specify the rights (ideally by git provider independent values).
   *  But since the method is currently NOT in use due to removal of publication repository. It is up to future developer.
   * @param repositoryOwner is the user part of the repository URL - Either name of the organization or of the user.
   * @param repoName is the name of the repository.
   */
  setBotAsCollaborator(repositoryOwner: string, repoName: string, accessToken: string): Promise<FetchResponse>;

  /**
   * Sets the repository secret for URL defined as urlRepoHost/{@link repositoryOwner}/{@link repoName}. Where urlRepoHost is for example github.com
   *  If the secret exists it is changed.
   */
  setRepositorySecret(repositoryOwner: string, repoName: string, accessToken: string, secretKey: string, secretValue: string): Promise<FetchResponse>;

  /**
   * Creates the publication repository. That is the repository to contain the generated artifacts and specifications.
   * This method does under the hood two important actions:
   *  1) Creates the publication repository.
   *  2) Sets bot as a collaborator. This is important, since the bot will be the one, which will push to the created publication repo.
   *     We have to do this, because the access tokens for the users are temporary, while this one is "permanent" (we can from time to time generate new one and set environment variables with it).
   *  3) Enable GitHub pages (or some other equivalent for different git providers)
   *
   * Note that for it to work, we should first set repository secret with the access token of the bot so it can commit to the remote publication repository within workflow (GitHub) action,
   *  that is gitProvider.setRepositorySecret(repositoryOwner, repoName, patAccessToken.value, "BOT_PAT_TOKEN", botAccessToken.value)
   *
   * @param repoName is the name of the repository, which contains publications
   * @param isUserRepo if true then it is repo created under user, if false it is created under organization
   * @param repositoryOwner is the name of the organization if {@link isUserRepo} is false, or name of user if it is true.
   *  If not provided then bot is used as a user and the {@link isUserRepo} is ignored (it is expected to be true).
   * @param accessToken if not given, the bot access token is used.
   * @deprecated We put the GitHub pages on the same repository instead of onto separate publication repository. We used to put it on repository suffixed by -publication-repo (hardcoded).
   */
  createPublicationRepository(repoName: string, isUserRepo: boolean, repositoryOwner?: string, accessToken?: string): Promise<FetchResponse>;

  /**
   * @returns The name of he directory under which are stored the workflow files in the corresponding git provider.
   */
  getWorkflowFilesDirectoryName(): string;

  /**
   * @returns True if the given {@link fullpath} is path to directory containing the git provider specific files (like workflow files). False otherwise.
   */
  isGitProviderDirectory(fullPath: string): boolean;

  /**
   * Implementation note: Note that this method can be implemented using url transformation + git clone. This is good to know if we ran into REST API requests limits.
   * @returns For given {@link repositoryURL} returns the default branch.
   *  Either the branch is present in side the {@link repositoryURL}, if not it is queried through REST API request.
   */
  getDefaultBranch(repositoryURL: string): Promise<string | null>;

  /**
   * Note that this method has default implementation in {@link GitProviderBase}.
   * @returns Returns the value of the commit reference hidden inside {@link repoURL} (for commits it is the hash, for branches branch name)
   *  and if the reference value is not specified it returns the name of the default branch
   *  (which can be found by querying the REST endpoint for the repository,
   *    at least in github case or by cloning the repository and checking on which branch we end up). and the {@link fallbackToDefaultBranch} is set to true in such case.
   */
  extractCommitReferenceValue(repoURL: string, commitReferenceType: CommitReferenceType): Promise<ExtractedCommitReferenceValueFromRepositoryURL>;

  /**
   * Note that this method has default implementation in {@link GitProviderBase}.
   * @param repositoryURL is the URL of the repository
   * @returns The part of given URL. Where the given URL can either be the main page
   *  (for example https://github.com/mff-uk/dataspecer) or some of the branches (for example https://github.com/mff-uk/dataspecer/tree/stable).
   *  Should also work for gitlab or any other git providers following similar URL structure.
   *  In the example mff-uk is "repository-owner" and dataspecer is "repository-name".
   *  For "branch" returns null, if it not explicitly provided in the {@link repositoryURL}.
   */
  extractPartOfRepositoryURL(repositoryURL: string, part: RepositoryURLPart): string | null;

  /**
   * Converts given {@link repositoryURL} to zip download link. Note that this method is implemented in {@link GitProviderBase}.
   * @param repositoryURL is the link to the repository. The method supports commit specific links. That is the {@link commitReferenceType} links.
   *  Note that if you don't know you should use the {@link getDefaultCommitReferenceTypeForZipDownload}. Then it treats it as link to commit.
   *  If the commit hash is not inside the link, it defaults into main branch.
   * @returns The link to download repostitory as a zip.
   */
  convertRepoURLToDownloadZipURL(repositoryURL: string, commitReferenceType: CommitReferenceType): Promise<ConvertRepoURLToDownloadZipURLReturnType>;

  /**
   * @param repositoryOwner - Either user under which is the repository or the organization
   * @param repoName - Repository name
   * @returns The URL, which looks like {@link gitProviderURL}/{@link repositoryOwner}/{@link repoName}, for other providers it might look different.
   *  It may be followed also by /tree/gitRef.name or /commit/gitref.sha (in GitHub case) if gitRef is defined.
   */
  createGitRepositoryURL(repositoryOwner: string, repoName: string, gitRef?: GitRef): string;

  /**
   * Similiar to {@link createGitRepositoryURL}, but this takes base {@link gitUrl} and extends it by {@link gitRef}.
   * @param gitRef If not defined then it returns the {@link gitUrl} unchanged.
   */
  extendGitRepositoryURLByGitRefSuffix(gitUrl: string, gitRef?: GitRef): string;

  /**
   * @returns Converts the {@link repositoryUrl}, which may possible point to commit or branch to the url, which is the homepage of the repository. For example https://github.com/dataspecer/dataspecer
   */
  extractDefaultRepositoryUrl(repositoryUrl: string): string;

  /**
   * @returns The scope strings for the specific generic scope. We return array since technically the mapping is not necessarilly 1:1.
   */
  convertGenericScopeToProviderScope(scope: Scope): string[];

  /**
   * @returns The given provider specific {@link scope} to the the generic scope.
   */
  convertProviderScopeToGenericScope(scope: string): Scope;

  /**
   * Removes the given {@link personalAccessToken} from git provider. We have to do this since AuthJS does not do it automatically on log off.
   *  If we did not do that then if somebody gets the access token he can safely use your github as long as you do not manually revoke it in Git provider.
   * @returns The git provider response from REST API (or possibly other API in future, like GraphQL)
   */
  revokePAT(personalAccessToken: string): Promise<FetchResponse>;
}

/**
 * Implementation of this itnerface is internally used inside node Git providers to provide internal methods. It is used using composite technique
 * (that is we use it as a field and provide the methods through API on the class which has it as a field).
 * Just check the node implementation for GitHub or GitLab for better understanding.
 */
export interface GitProviderInternalCompositeNode {
  /**
   * @param commitReference note that is not necessary branch, it can be also commit or tag.
   * @returns Returns the last commit hash in repository with the following url gitProviderURL/{@link repositoryOwner}/{@link repoName}.
   *  If {@link commitReference} is provided then the last commit hash on that branch (or commit/tag ref) is returned, otherwise the last commit hash on default branch is returned.
   *  If issue occurred, then null is returned.
   *  If the {@link isCommit} is true, then it just tries to take the value from {@link commitReference}. This is just optimization so we don't clone when not necessary.
   */
  getLastCommitHash(repositoryOwner: string, repoName: string, commitReference?: string, isCommit?: boolean): Promise<string | null>;

  /**
   * Same as {@link getLastCommitHash}, but gets url instead of explicit parts.
   * The url can be the commit specific, if it is the branch/commit will be extracted from it and correct last commit will be used.
   * @param commitReferenceType If null then it defaults to branch.
   * @param commitReferenceValue if not provided then it is extracted from the {@link repositoryUrl}.
   */
  getLastCommitHashFromUrl(repositoryUrl: string, commitReferenceType: CommitReferenceType | null, commitReferenceValue: string | null): Promise<string>;
}

/**
 * The GitProvider interface which additionally contains node specific libraries
 */
export interface GitProviderNode extends GitProvider, GitProviderInternalCompositeNode {
  /**
   * Copies (or rather create file links, but the end effect is same, we just safe space and actions on hard drive)
   *  the workflow files (that is for example in case of GitHub the GitHub actions) to the {@link copyTo}.
   *  Note that each provider should have the workflow files specific for their CI/CD.
   */
  copyWorkflowFiles(copyTo: string): void;
}
