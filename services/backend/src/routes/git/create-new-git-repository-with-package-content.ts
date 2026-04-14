import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { resourceModel, webhookUrl } from "../../main.ts";
import { ScopeGroup, convertToValidGitName, extractPartOfRepositoryURL, findPatAccessToken, findPatAccessTokens, convertStringToExportVersion, PUBLICATION_BRANCH_DEFAULT_NAME, stringToBoolean, transformCommitMessageIfEmpty, getDefaultExportVersion, getDefaultExportFormat, isExportFormatType, convertStringToExportFormat, AccessTokenType } from "@dataspecer/git";
import { commitPackageToGitUsingAuthSession, CommitUsingAuthSessionParams } from "./commit-package-to-git.ts";
import { getGitCredentialsFromSessionWithDefaults } from "../../authentication/auth-session.ts";
import { checkErrorBoundaryForCommitAction, CommitBranchAndHashInfo, GitCommitToCreateInfoBasic, GitRepositoryIdentification } from "@dataspecer/git-node";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../../configuration.ts";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";


/**
 * Creates Git provider repository with content equal to the package with given iri inside the query part of express http request.
 * The organization field is used only if isUserRepo is false
 */
export const createNewGitRepositoryWithPackageContent = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    organization: z.string(),
    givenRepositoryName: z.string().min(1),
    gitProviderURL: z.string().min(1),
    commitMessage: z.string(),
    isUserRepo: z.string().min(1),
    publicationBranch: z.string().min(1).optional(),
    exportFormat: z.string().min(1).optional(),
    exportVersion: z.string().min(1).optional(),
  });

  const query = querySchema.parse(request.query);
  query.publicationBranch ??= PUBLICATION_BRANCH_DEFAULT_NAME;
  const gitProvider = GitProviderNodeFactory.createGitProviderFromRepositoryURL(query.gitProviderURL, httpFetch, configuration);
  const { name: sessionUserName, accessTokens } = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ScopeGroup.FullPublicRepoControl, ScopeGroup.DeleteRepoControl]);
  const isUserRepo = stringToBoolean(query.isUserRepo);
  const organization = isUserRepo ? null : convertToValidGitName(query.organization);
  const commitMessage = transformCommitMessageIfEmpty(query.commitMessage);
  const repositoryName = convertToValidGitName(query.givenRepositoryName);
  const patAccessTokens = findPatAccessTokens(accessTokens);
  // Either the user has create repo access AND it has access to the "user", then we are good
  // Or it has create repo access, but does not have access to the "user". Then we have two possibilities
  //  either we fail, or we will try the bot token to create the repositories. To me the second one makes more sense. So that is the implemented variant.
  for (const patAccessToken of patAccessTokens) {
    if (patAccessToken.type === AccessTokenType.SSH) {
      continue;
    }
    try {
      let repositoryOwner: string;      // .... OAuth is being funny, since the name you get may be your actual name if you have it set and not the login name which is used in the url
      if (isUserRepo) {
        const repositoryOwnerCandidate = await gitProvider.getUserLoginForAuthToken(patAccessToken.value);
        if (repositoryOwnerCandidate === null) {
          continue;
        }
        repositoryOwner = repositoryOwnerCandidate;
      }
      else {
        repositoryOwner = organization!;
      }
      const fullLinkedGitRepositoryURL = gitProvider.createGitRepositoryURL(repositoryOwner, repositoryName);
      if (isUserRepo) {
        // If it is user repo then the owner of the pat access token have to be the user of the user part of repository url
        // In other words if it is bot token then the repositoryOwner has to be bot name
        if (patAccessToken.isBotAccessToken && repositoryOwner !== gitProvider.getBotCredentials()?.name) {
          continue;
        }
      }

      const { defaultBranch } = await gitProvider.createRemoteRepository(patAccessToken.value, organization, repositoryName, true, query.publicationBranch);


      await gitProvider.createWebhook(patAccessToken.value, repositoryOwner, repositoryName, webhookUrl, ["push"]);
      // The projectIri is undefiend since it should be already set from the time we created the resource
      await resourceModel.updateResourceProjectIriAndBranch(query.iri, undefined, defaultBranch ?? undefined);
      await resourceModel.updateResourceGitLink(query.iri, fullLinkedGitRepositoryURL, true);

      const repositoryIdentificationInfo: GitRepositoryIdentification = {
        repositoryOwner,
        repositoryName,
      };

      const exportFormat = convertStringToExportFormat(query.exportFormat);
      const commitInfo: GitCommitToCreateInfoBasic = {
        commitMessage,
        exportFormat: exportFormat,
        exportVersion: convertStringToExportVersion(query.exportVersion),
      };

      const commitBranchAndHashInfo: CommitBranchAndHashInfo = {
        localBranch: defaultBranch,
        localLastCommitHash: "",
        mergeFromData: null,
      };

      // Get the updated resource, howver, it should be already set, so technically we could get it before the for cycle
      const resource = await resourceModel.getResource(query.iri);
      if (resource === null) {
        throw new Error(`Can not commit to git since the resource (iri: ${query.iri}) does not exist`);
      }

      const commitParams: CommitUsingAuthSessionParams = {
        iri: query.iri,
        projectIri: resource.projectIri,
        request,
        response,
        branchAndLastCommit: commitBranchAndHashInfo,
        repositoryIdentificationInfo,
        gitCommitInfoBasic: commitInfo,
        shouldAlwaysCreateMergeState: false,
        shouldAppendAfterDefaultMergeCommitMessage: null,
        remoteRepositoryUrl: fullLinkedGitRepositoryURL,
        commitType: "classic-commit",
      };
      // Just provide empty merge from values, since we are newly creating the link we can not perform merge right away anyways
      const commitConflictInfo = await commitPackageToGitUsingAuthSession(commitParams);

      if (commitConflictInfo !== null) {
        response.sendStatus(409);
        return;
      }

      await resourceModel.setHasUncommittedChanges(query.iri, false);
      response.sendStatus(200);
      return;
    }
    catch(error) {
      throw error;
      // EMPTY, we just want to try another iteration, don't care about errors
    }
  }

  throw new Error("There is neither user or bot pat token to perform operations needed to create the link. For example creating remote repo");
});


// TODO: This one I am not sure if it is working yet - also I should create new thing in database or at least set the gitRepositoryLink on it
//       ... Honestly I don't know:
//                                  - I should create new one since what do I gain by having two of same packages in DS, but we are linked to git repo, so the updates will cause insane conflicts (unless of course we will be in different branches)
//                                  - I link it to the old one - sure I wont get conflicts, but what is the point? I have two same packages in DS - I feel like this is only useful once we use branch swapping
/**
 * Creates new Dataspecer package, which is linked to already existing Git repository.
 *  Which technically means that new webhook is added to the repository
 * @deprecated Maybe deprecated? I don't call the endpoint from frontend
 */
export const createPackageFromExistingGitRepository = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    gitRepositoryURL: z.string().min(1),
    commitMessage: z.string(),
    exportFormat: z.string().min(1).optional(),
    exportVersion: z.string().min(1).optional(),
  });

  const query = querySchema.parse(request.query);

  const commitMessage = transformCommitMessageIfEmpty(query.commitMessage);
  const gitProvider = GitProviderNodeFactory.createGitProviderFromRepositoryURL(query.gitRepositoryURL, httpFetch, configuration);
  const repositoryName = gitProvider.extractPartOfRepositoryURL(query.gitRepositoryURL, "repository-name");
  const repositoryOwner = gitProvider.extractPartOfRepositoryURL(query.gitRepositoryURL, "repository-owner");
  const branchName = gitProvider.extractPartOfRepositoryURL(query.gitRepositoryURL, "branch");

  checkErrorBoundaryForCommitAction(query.gitRepositoryURL, repositoryName, repositoryOwner);

  const { accessTokens } = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ScopeGroup.FullPublicRepoControl, ScopeGroup.DeleteRepoControl]);
  const accessToken = findPatAccessToken(accessTokens);
  if (accessToken === null) {
    throw new Error("There is neither user or bot pat token to perform operations needed to create the link. For example creating remote repo");
  }
  await gitProvider.createWebhook(accessToken.value, repositoryOwner!, repositoryName!, webhookUrl, ["push"]);

  const repositoryIdentificationInfo: GitRepositoryIdentification = {
    repositoryOwner: repositoryOwner!,
    repositoryName: repositoryName!,
  };

  const exportFormat = convertStringToExportFormat(query.exportFormat);
  const commitInfo: GitCommitToCreateInfoBasic = {
    commitMessage,
    exportFormat: exportFormat,
    exportVersion: convertStringToExportVersion(query.exportVersion),
  };

  const commitBranchAndHashInfo: CommitBranchAndHashInfo = {
    localBranch: branchName,
    localLastCommitHash: "",
    mergeFromData: null,
  };

  const resource = await resourceModel.getResource(query.iri);
  if (resource === null) {
    throw new Error(`Can not commit to git since the resource (iri: ${query.iri}) does not exist`);
  }

  const commitParams: CommitUsingAuthSessionParams = {
    iri: query.iri,
    projectIri: resource.projectIri,
    request,
    response,
    branchAndLastCommit: commitBranchAndHashInfo,
    repositoryIdentificationInfo,
    gitCommitInfoBasic: commitInfo,
    shouldAlwaysCreateMergeState: false,
    shouldAppendAfterDefaultMergeCommitMessage: null,
    remoteRepositoryUrl: query.gitRepositoryURL,
    commitType: "classic-commit",
  };
  // Just provide empty merge from values, since we are newly creating the link we can not perform merge right away anyways
  await commitPackageToGitUsingAuthSession(commitParams);
});

/**
 * TODO RadStr After: Not used
 */
async function getRepositoryNameFromDatabase(linkedPackageIri: string): Promise<string | null> {
  const resource = await resourceModel.getResource(linkedPackageIri);
  if (resource === null) {
    throw new Error(`Package with given iri: ${linkedPackageIri} does not exist.`);
  }

  return extractPartOfRepositoryURL(resource.linkedGitRepositoryURL, "repository-name");
}
