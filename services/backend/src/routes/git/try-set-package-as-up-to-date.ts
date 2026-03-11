import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import express from "express";
import { resourceModel } from "../../main.ts";
import { gitCloneBasic } from "@dataspecer/git-node/simple-git-methods";
import { compareBackendFilesystems, createSimpleGitUsingPredefinedGitRoot, MergeEndpointForComparison, removePathRecursively, TMP_CLONE_PATH_PREFIX } from "@dataspecer/git-node";
import { AvailableFilesystems, ConfigType, extractPartOfRepositoryURL, getAuthorizationURL, GitIgnoreBase } from "@dataspecer/git";
import { GitProviderFactory } from "@dataspecer/git/git-providers";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import { getGitCredentialsFromSessionWithDefaults } from "../../authentication/auth-session.ts";
import configuration from "../../configuration.ts";
import { createFilesystemFactoryParams } from "../../utils/filesystem-helpers.ts";


/**
 * Compares remote Git package with the package in DS and sets the is up to date flag based on if the packages is up to date with the Git Remote or not.
 */
export const trySetPackageAsUpToDate = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
  });
  const { iri } = querySchema.parse(request.query);
  const resource = await resourceModel.getResource(iri);
  if (resource === null) {
    response.status(404).json({error: `The provided iri ${iri} has no resource in database`});
    return;
  }
  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(resource.linkedGitRepositoryURL, httpFetch, configuration);

  const { git, gitInitialDirectory, gitInitialDirectoryParent, gitDirectoryToRemoveAfterWork } = createSimpleGitUsingPredefinedGitRoot(iri, TMP_CLONE_PATH_PREFIX, true);
  let isLastAccessToken = false;
  const gitCredentials = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ConfigType.FullPublicRepoControl]);
  const repositoryOwner = extractPartOfRepositoryURL(resource.linkedGitRepositoryURL, "repository-owner");
  const repositoryName = extractPartOfRepositoryURL(resource.linkedGitRepositoryURL, "repository-name");
  if (repositoryOwner === null || repositoryName === null) {
    response.status(400).json({error: `The repository URL ${resource.linkedGitRepositoryURL} could not be parsed to get the owner and name; owner: ${repositoryOwner}; name: ${repositoryName}`});
    return;
  }

  try {
    for (const accessToken of gitCredentials.accessTokens) {
      const repoURLWithAuthorization = getAuthorizationURL(gitCredentials, accessToken, resource.linkedGitRepositoryURL, repositoryOwner, repositoryName);
      isLastAccessToken = accessToken === gitCredentials.accessTokens.at(-1);

      // 1) Load from Git
      try {
        await gitCloneBasic(git, gitInitialDirectory, repoURLWithAuthorization, true, true, resource.branch, 1);
      }
      catch {
        if (isLastAccessToken) {
          response.status(403).json({error: "The remote repository cannot be cloned. Therefore, we can not perform the comparison between current DS state and the Git remote state"});
          return;
        }
        else {
          continue;
        }
      }
      const hash = await git.revparse(['HEAD']);
      if (hash !== resource.lastCommitHash) {
        response.status(404).json({error: `The provided hashes do not match - fetched hash (${hash}). The last commit hash (${resource.lastCommitHash})`});
        return;
      }

      // 2) Compare
      const gitEndpoint: MergeEndpointForComparison = {
        rootIri: iri,
        filesystemFactoryParams: createFilesystemFactoryParams(false),
        gitIgnore: new GitIgnoreBase(gitProvider),
        fullPathToRootParent: gitInitialDirectoryParent,
        filesystemType: AvailableFilesystems.ClassicFilesystem,
      };
      const dsEndpoint: MergeEndpointForComparison = {
        rootIri: iri,
        filesystemFactoryParams: createFilesystemFactoryParams(true),
        gitIgnore: null,
        fullPathToRootParent: gitInitialDirectoryParent,      // TODO RadStr: The value probably should not matter
        filesystemType: AvailableFilesystems.DS_Filesystem,
      };
      const { diffTreeComparison } = await compareBackendFilesystems(gitEndpoint, dsEndpoint, "pull");

      // 3) Set the result
      const hasUncommittedChanges = diffTreeComparison.conflicts.length !== 0 || diffTreeComparison.created.length !== 0 ||
                                    diffTreeComparison.changed.length !== 0 || diffTreeComparison.removed.length !== 0;
      resourceModel.setHasUncommittedChanges(iri, hasUncommittedChanges);
      if (hasUncommittedChanges) {
        response.sendStatus(204);
      }
      else {
        response.sendStatus(200);
      }
      return;
    }
  }
  catch(error) {
    throw error;      // Should not happen. The cloning is covered by separate try/catch. Other code should not throw exceptions
  }
  finally {
    removePathRecursively(gitDirectoryToRemoveAfterWork);
  }
});
