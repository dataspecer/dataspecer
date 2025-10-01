import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { mergeStateModel, resourceModel } from "../main.ts";

import { BranchSummary, CommitResult, MergeResult, SimpleGit } from "simple-git";
import { checkErrorBoundaryForCommitAction, extractPartOfRepositoryURL, getAuthorizationURL, getLastCommit, getLastCommitHash, removeEverythingExcept, removePathRecursively } from "../utils/git-utils.ts";
import { AvailableFilesystems, ConfigType, GitProvider, GitCredentials, getMergeFromMergeToForGitAndDS, CommitInfo } from "@dataspecer/git";
import { GitProviderFactory } from "../git-providers/git-provider-factory.ts";

import { createUniqueCommitMessage } from "../utils/git-utils.ts";
import { getGitCredentialsFromSessionWithDefaults } from "../authorization/auth-session.ts";
import { createReadmeFile } from "../git-readme/readme-generator.ts";
import { ReadmeTemplateData } from "../git-readme/readme-template.ts";
import { AvailableExports } from "../export-import/export-actions.ts";
import { createSimpleGit, getCommonCommitInHistory, gitCloneBasic, CreateSimpleGitResult, UniqueDirectory } from "../utils/simple-git-utils.ts";
import { compareBackendFilesystems, compareGitAndDSFilesystems } from "../export-import/filesystem-abstractions/backend-filesystem-comparison.ts";
import { MERGE_DS_CONFLICTS_PREFIX, PUSH_PREFIX } from "../models/git-store-info.ts";
import { PackageExporterByResourceType } from "../export-import/export-by-resource-type.ts";
import { MergeEndInfoWithRootNode } from "../models/merge-state-model.ts";
import { MergeEndpointForComparison } from "./create-merge-state.ts";
import fs from "fs";


export type RepositoryIdentificationInfo = {
  givenRepositoryUserName: string,
  givenRepositoryName: string,
}

/**
 * {@link GitCommitToCreateInfoBasic} but no more ambiguities, everything is set
 */
type GitCommitToCreateInfoExplicitWithCredentials = {
  gitCredentials: GitCredentials,
  commitMessage: string,
  gitProvider: GitProvider,
  exportFormat: string | null,
}

export type GitCommitToCreateInfoBasic = {
  commitMessage: string | null,
  gitProvider?: GitProvider,
  exportFormat: string | null,
}

export type CommitBranchAndHashInfo = {
  localBranch: string | null,
  localLastCommitHash: string,
  mergeFromBranch: string,
  mergeFromCommitHash: string,
  mergeFromIri: string,
}


/**
 * Same as {@link CommitBranchAndHashInfo}, but with renamed fields to mergeTo
 */
type CommitBranchAndHashInfoForMerge = {
  mergeToBranch: string | null,
  mergeToCommitHash: string,
  mergeFromBranch: string,
  mergeFromCommitHash: string,
  mergeFromIri: string,
}

function convertBranchAndHashToMergeInfo(input: CommitBranchAndHashInfo): CommitBranchAndHashInfoForMerge {
  return {
    mergeToBranch: input.localBranch,
    mergeToCommitHash: input.localLastCommitHash,
    mergeFromBranch: input.mergeFromBranch,
    mergeFromCommitHash: input.mergeFromCommitHash,
    mergeFromIri: input.mergeFromIri,
  };
}



/**
 * Commit to the repository for package identifier by given iri inside the query part of express http request.
 */
export const commitPackageToGitHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    commitMessage: z.string(),
    exportFormat: z.string().min(1).optional(),
  });

  const query = querySchema.parse(request.query);

  const iri = query.iri;
  const commitMessage = query.commitMessage.length === 0 ? null : query.commitMessage;
  const resource = await resourceModel.getResource(iri);
  if (resource === null) {
    throw new Error(`Can not commit to git since the resource (iri: ${iri}) does not exist`);
  }
  const gitLink = resource.linkedGitRepositoryURL;
  const userName = extractPartOfRepositoryURL(gitLink, "user-name");
  const repoName = extractPartOfRepositoryURL(gitLink, "repository-name");
  checkErrorBoundaryForCommitAction(gitLink, repoName, userName);

  const branch = resource.branch === "main." ? null : resource.branch;
  const repositoryIdentificationInfo: RepositoryIdentificationInfo = {
    givenRepositoryUserName: userName!,
    givenRepositoryName: repoName!,
  };

  // TODO RadStr: Not entirely sure about this ... I guess that I should just call merge commit explictly when finalizing instead of doing this, it will be easier to implement
  const mergeStatesForResource = await mergeStateModel.getMergeStatesForMergeTo(resource.iri, false);
  if (mergeStatesForResource.length > 1) {
    throw new Error(`Too many merge states, where the given resource (${resource.iri}) figures as mergeTo actor`);
  }


  const branchAndLastCommit: CommitBranchAndHashInfo = {
    localBranch: branch,
    localLastCommitHash: resource.lastCommitHash,
    mergeFromBranch: mergeStatesForResource[0].branchMergeFrom,
    mergeFromCommitHash: mergeStatesForResource[0].lastCommitHashMergeFrom,
    mergeFromIri: mergeStatesForResource[0].rootIriMergeFrom,
  };

  const gitCommitInfo: GitCommitToCreateInfoBasic = {
    commitMessage,
    gitProvider: undefined,
    exportFormat: query.exportFormat ?? null
  };

  const commitResult = await commitPackageToGitUsingAuthSession(
    request, iri, gitLink, branchAndLastCommit, repositoryIdentificationInfo, response, gitCommitInfo);

  if (!commitResult) {
    response.sendStatus(409);
    return;
  }
  response.sendStatus(200);
  return;
});


/**
 * Gets authorization information from current session (if someting is missing use default bot credentials)
 *  and uses that information for the commit.
 */
export const commitPackageToGitUsingAuthSession = async (
  request: express.Request,
  iri: string,
  remoteRepositoryURL: string,
  branchAndLastCommit: CommitBranchAndHashInfo,
  repositoryIdentificationInfo: RepositoryIdentificationInfo,
  response: express.Response,
  gitCommitInfoBasic: GitCommitToCreateInfoBasic,
) => {
  // If gitProvider not given - extract it from url
  const gitProvider = gitCommitInfoBasic.gitProvider ?? GitProviderFactory.createGitProviderFromRepositoryURL(remoteRepositoryURL);
  const committer = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl]);
  const commitInfo: GitCommitToCreateInfoExplicitWithCredentials = {
    gitCredentials: committer,
    commitMessage: gitCommitInfoBasic.commitMessage ?? createUniqueCommitMessage(),
    gitProvider: gitProvider,
    exportFormat: gitCommitInfoBasic.exportFormat,
  };
  return await commitPackageToGit(iri, remoteRepositoryURL, branchAndLastCommit, repositoryIdentificationInfo, commitInfo);
}


// TODO RadStr Idea: Teoreticky bych mohl mit defaultni commit message ulozenou v konfiguraci (na druhou stranu vzdy chci zadat nejakou commit message)
/**
 * Commit to the repository for package identifier by given iri.
 * @param commitMessage if null then default message is used.
 * @param localLastCommitHash if empty string then there is no check for conflicts -
 *  it is expected to be the first commit on repository
 *  (however it also works the if we just want to set new last commit and
 *   do not want to cause any conflicts, we just commit current content and push it)
 * @returns true on successful commit. False when merge state was created (that is there were conflicts).
 */
export const commitPackageToGit = async (
  iri: string,
  remoteRepositoryURL: string,
  branchAndLastCommit: CommitBranchAndHashInfo,
  repositoryIdentificationInfo: RepositoryIdentificationInfo,
  commitInfo: GitCommitToCreateInfoExplicitWithCredentials,
): Promise<boolean> => {
  // Note that the logic for both is similiar create git, clone, check if should create merge state conflict, perform export and "force" push.
  if (branchAndLastCommit.mergeFromCommitHash === "") {
    return await commitClassicToGit(
      iri, remoteRepositoryURL, branchAndLastCommit.localBranch, branchAndLastCommit.localLastCommitHash,
      repositoryIdentificationInfo, commitInfo);
  }
  else {
    const mergeInfo = convertBranchAndHashToMergeInfo(branchAndLastCommit);
    return await commitDSMergeToGit(iri, remoteRepositoryURL, repositoryIdentificationInfo, commitInfo, mergeInfo);
  }
};



async function commitDSMergeToGit(
  iri: string,
  remoteRepositoryURL: string,
  repositoryIdentificationInfo: RepositoryIdentificationInfo,
  commitInfo: GitCommitToCreateInfoExplicitWithCredentials,
  mergeInfo: CommitBranchAndHashInfoForMerge,
): Promise<boolean> {
  // Note that the logic follows the commit method logic - create git, clone, check if should create merge state conflict, perform export and "force" merge/push.
  const { mergeFromBranch, mergeFromCommitHash, mergeToBranch, mergeToCommitHash } = mergeInfo;
  const { givenRepositoryUserName, givenRepositoryName } = repositoryIdentificationInfo;
  const { gitCredentials, gitProvider } = commitInfo;


  const createSimpleGitResult: CreateSimpleGitResult = createSimpleGit(iri, MERGE_DS_CONFLICTS_PREFIX, true);
  const { git, gitInitialDirectory, gitInitialDirectoryParent } = createSimpleGitResult;

  for (const accessToken of gitCredentials.accessTokens) {
    const repoURLWithAuthorization = getAuthorizationURL(gitCredentials, accessToken, remoteRepositoryURL, givenRepositoryUserName, givenRepositoryName);
    const isLastAccessToken = accessToken === gitCredentials.accessTokens.at(-1);

    const hasSetLastCommit: boolean = mergeToCommitHash !== "";


    const cloneResult = await cloneBeforeMerge(git, gitInitialDirectory, repoURLWithAuthorization, mergeFromBranch, mergeToBranch, isLastAccessToken);
    if (!cloneResult.isClonedSuccessfully) {
      continue;
    }

    const mergeFromBranchLog = await git.log([mergeFromBranch]);
    const lastMergeFromBranchCommitInGit = mergeFromBranchLog.latest?.hash;
    const shouldTryCreateMergeState = lastMergeFromBranchCommitInGit !== mergeFromCommitHash;

    if (shouldTryCreateMergeState) {
      const mergeFrom: MergeEndpointForComparison = {
        gitProvider: commitInfo.gitProvider,
        rootIri: mergeInfo.mergeFromIri,
        filesystemType: AvailableFilesystems.DS_Filesystem,
        fullPath: gitInitialDirectoryParent,
      };

      const mergeTo: MergeEndpointForComparison = {
        gitProvider: commitInfo.gitProvider,
        rootIri: mergeInfo.mergeFromIri,
        filesystemType: AvailableFilesystems.DS_Filesystem,
        fullPath: gitInitialDirectoryParent,
      };

      const {
        diffTreeComparisonResult,
        rootMergeFrom,
        pathToRootMetaMergeFrom,
        filesystemMergeFrom,
        rootMergeTo,
        pathToRootMetaMergeTo,
        filesystemMergeTo,
      } = await compareBackendFilesystems(mergeFrom, mergeTo);

      const commonCommitHash = await getCommonCommitInHistory(git, mergeFromCommitHash, mergeToCommitHash);

      const mergeFromInfo: MergeEndInfoWithRootNode = {
        rootNode: rootMergeFrom,
        filesystemType: filesystemMergeFrom.getFilesystemType(),
        lastCommitHash: mergeFromCommitHash,
        branch: mergeFromBranch,
        rootFullPathToMeta: pathToRootMetaMergeFrom,
      };
      const mergeToInfo: MergeEndInfoWithRootNode = {
        rootNode: rootMergeTo,
        filesystemType: filesystemMergeTo.getFilesystemType(),
        lastCommitHash: mergeToCommitHash,
        branch: cloneResult.mergeToBranchExplicitName,
        rootFullPathToMeta: pathToRootMetaMergeTo,
      };

      const createdMergeStateId = await mergeStateModel.createMergeStateIfNecessary(
        iri, "merge", diffTreeComparisonResult, commonCommitHash, mergeFromInfo, mergeToInfo);
      if (diffTreeComparisonResult.conflicts.length > 0) {
        return false;
      }
      // Well now what? For some reason the merge state was not created, but I think that it always should be, since we are not matching the commit hashes.
      // Actually if we commit and then revert then we don't get conflicts
    }


    // If the merge from branch does not exist in git - push it
    // TODO RadStr: For now ... I guess that I will just force the user to create it otherwise he can not merge
    // TODO RadStr: Also sideways note ... I want to always perform merge on DS and GIT, since if I have perform merge on 2 DS branches, there is "small" issue -
    //              - The user can modify the merge from package, that is problem since then we are not actually performing merge in git (That is from fixed point in time),
    //                 but some weird semi-state merge
    // if (!cloneResult.mergeFromBranchExists) {
    //   await git.checkout(mergeFromBranch);
    //   await git.push(repoURLWithAuthorization);
    //   await git.checkout(mergeToBranchExplicit);
    // }


    const pushResult = await exportAndPushToGit(
      createSimpleGitResult, iri, repoURLWithAuthorization, repositoryIdentificationInfo,
      commitInfo, hasSetLastCommit, mergeFromBranch, isLastAccessToken);
    if (pushResult) {
      return pushResult;
    }
  }
  throw new Error("Unknown error when merging DS branches. This should be unreachable code. There were probably no access tokens available in DS at all");
}

async function commitClassicToGit(
  iri: string,
  remoteRepositoryURL: string,
  branch: string | null,
  localLastCommitHash: string,
  repositoryIdentificationInfo: RepositoryIdentificationInfo,
  commitInfo: GitCommitToCreateInfoExplicitWithCredentials,
) {
  const { gitCredentials, gitProvider } = commitInfo;
  const { givenRepositoryUserName, givenRepositoryName } = repositoryIdentificationInfo;


  const createSimpleGitResult: CreateSimpleGitResult = createSimpleGit(iri, PUSH_PREFIX, true);
  const { git, gitDirectoryToRemoveAfterWork, gitInitialDirectory, gitInitialDirectoryParent } = createSimpleGitResult;

  for (const accessToken of gitCredentials.accessTokens) {

    const repoURLWithAuthorization = getAuthorizationURL(gitCredentials, accessToken, remoteRepositoryURL, givenRepositoryUserName, givenRepositoryName);
    const isLastAccessToken = accessToken === gitCredentials.accessTokens.at(-1);

    const hasSetLastCommit: boolean = localLastCommitHash !== "";

    const { isCloneSuccessful } = await cloneBeforeCommit(
      git, gitInitialDirectory, repoURLWithAuthorization, branch,
      localLastCommitHash, hasSetLastCommit, isLastAccessToken);
    if (!isCloneSuccessful) {
      continue;
    }

    if (hasSetLastCommit) {
      try {
        const remoteRepositoryLastCommitHash = await getLastCommitHash(git);
        const shouldTryCreateMergeState = localLastCommitHash !== remoteRepositoryLastCommitHash;
        if (shouldTryCreateMergeState) {
          const {
            diffTreeComparisonResult,
            rootMergeFrom,
            pathToRootMetaMergeFrom,
            filesystemMergeFrom,
            rootMergeTo,
            pathToRootMetaMergeTo,
            filesystemMergeTo,
          } = await compareGitAndDSFilesystems(gitProvider, iri, gitInitialDirectoryParent, "push");

          const branchExplicit = (await git.branch()).current;
          const commonCommitHash = await getCommonCommitInHistory(git, localLastCommitHash, remoteRepositoryLastCommitHash);
          const { valueMergeFrom: lastHashMergeFrom, valueMergeTo: lastHashMergeTo } = getMergeFromMergeToForGitAndDS("push", localLastCommitHash, remoteRepositoryLastCommitHash);
          const mergeFromInfo: MergeEndInfoWithRootNode = {
            rootNode: rootMergeFrom,
            filesystemType: filesystemMergeFrom.getFilesystemType(),
            lastCommitHash: lastHashMergeFrom,
            branch: branchExplicit,
            rootFullPathToMeta: pathToRootMetaMergeFrom,
          };
          const mergeToInfo: MergeEndInfoWithRootNode = {
            rootNode: rootMergeTo,
            filesystemType: filesystemMergeTo.getFilesystemType(),
            lastCommitHash: lastHashMergeTo,
            branch: branchExplicit,
            rootFullPathToMeta: pathToRootMetaMergeTo,
          };


          const createdMergeStateId = await mergeStateModel.createMergeStateIfNecessary(
            iri, "push", diffTreeComparisonResult, commonCommitHash, mergeFromInfo, mergeToInfo);
          if (diffTreeComparisonResult.conflicts.length > 0) {
            return false;
          }
        }
      }
      catch(error) {
        // Remove only on failure, otherwise there is conflict and we want to keep it for merge state
        removePathRecursively(gitDirectoryToRemoveAfterWork);
        throw error;      // Rethrow
      }
    }

    const pushResult = await exportAndPushToGit(
      createSimpleGitResult, iri, repoURLWithAuthorization, repositoryIdentificationInfo,
      commitInfo, hasSetLastCommit, null, isLastAccessToken);
    if (pushResult) {
      return pushResult;
    }
  }

  throw new Error("Unknown error when commiting. This should be unreachable code. There were probably no access tokens available in DS at all");
}

/**
 * @param mergeFromBranch if null, then it is classic commit, if not then merge commit
 * @returns True if successful. False if not and throws error if the failure was for the last access token
 */
async function exportAndPushToGit(
  createSimpleGitResult: CreateSimpleGitResult,
  iri: string,
  repoURLWithAuthorization: string,
  repositoryIdentificationInfo: RepositoryIdentificationInfo,
  commitInfo: GitCommitToCreateInfoExplicitWithCredentials,
  hasSetLastCommit: boolean,
  mergeFromBranch: string | null,
  isLastAccessToken: boolean,
): Promise<boolean> {
  const { git, gitDirectoryToRemoveAfterWork } = createSimpleGitResult;
  const { commitMessage, gitCredentials } = commitInfo;

  let mergeMessage: string = "";
  if (mergeFromBranch !== null) {
    try {
      const mergeResult = await git.merge(["--no-commit", "--no-ff", mergeFromBranch]);
      console.info({mergeResult});    // TODO RadStr: Debug print
    }
    catch(mergeError) {
      console.info(mergeError);       // TODO RadStr: Debug print
    }
    const fullMergeMessagge = fs.readFileSync(`${createSimpleGitResult.gitInitialDirectory}/.git/MERGE_MSG`, "utf-8");
    mergeMessage = fullMergeMessagge.substring(0, fullMergeMessagge.indexOf("\n"));
  }

  await fillGitDirectoryWithExport(iri, createSimpleGitResult, commitInfo.gitProvider, commitInfo.exportFormat, repositoryIdentificationInfo, hasSetLastCommit);

  // TODO RadStr: Debug print to remove
  for (let i = 0; i < 10; i++) {
    console.info("*****************************************************");
  }

  try {
    // Get list of all branches (local + remote)
    const branches = await git.branch(['-a']);

    for (const branchName of Object.keys(branches.branches)) {
      console.log(`\n=== History for branch: ${branchName} ===`);

      // Get commit history of each branch
      const log = await git.log([branchName]);

      log.all.forEach(commit => {
        console.log(`${commit.date} | ${commit.hash} | ${commit.message} | ${commit.author_name}`);
      });
    }
  } catch (err) {
    console.error('Error fetching history:', err);
  }

  try {
    let commitResult: CommitResult;
    if (mergeFromBranch === null) {
      commitResult = await createClassicGitCommit(git, ["."], commitMessage, gitCredentials.name, gitCredentials.email);
    }
    else {
      commitResult = await createMergeCommit(git, ["."], mergeMessage, commitMessage, gitCredentials.name, gitCredentials.email, mergeFromBranch);
    }

    // TODO RadStr: Debug print to remove
    for (let i = 0; i < 10; i++) {
      console.info("-----------------------------------------------");
    }
    try {
      // Get list of all branches (local + remote)
      const branches = await git.branch(['-a']);

      for (const branchName of Object.keys(branches.branches)) {
        console.log(`\n=== History for branch: ${branchName} ===`);

        // Get commit history of each branch
        const log = await git.log([branchName]);

        log.all.forEach(commit => {
          console.log(`${commit.date} | ${commit.hash} | ${commit.message} | ${commit.author_name}`);
        });
      }
    }
    catch (err) {
      console.error('Error fetching history:', err);
    }


    if (commitResult.commit !== "") {
      // We do not need any --force or --force-with-leash options, this is enough
      await git.push(repoURLWithAuthorization);
      await resourceModel.updateLastCommitHash(iri, commitResult.commit);
    }
    // Else no changes

    return true;    // We are done
  }
  catch(error) {
    throw error;      // TODO RadStr: Throw now for debug purposes
    // Error can be caused by Not sufficient rights for the pushing - then we have to try all and fail on last
    if (isLastAccessToken) {
      // If it is last then rethrow. Otherwise try again.
      throw error;
    }
    else {
      // TODO RadStr: Print it for now, however it really should be only issue with rights
      console.error({error});
      return false;
    }
  }
  finally {
    // It is important to not only remove the actual files, but also the .git directory,
    // otherwise we would later also push the git history, which we don't want (unless we get the history through git clone)
    removePathRecursively(gitDirectoryToRemoveAfterWork);
  }
}


async function fillGitDirectoryWithExport(
  iri: string,
  gitPaths: UniqueDirectory,
  gitProvider: GitProvider,
  exportFormat: string | null,
  repositoryIdentificationInfo: RepositoryIdentificationInfo,
  hasSetLastCommit: boolean,
) {
  const { gitDirectoryToRemoveAfterWork, gitInitialDirectory, gitInitialDirectoryParent } = gitPaths;

  try {
    // Remove the content of the git directory and then replace it with the export
    // Alternatively we could keep the content and run await git.rm(['-r', '.']) ... however that would to know exactly
    //  what files were exported. So we can add them explicitly instead of running git add .
    removeEverythingExcept(gitInitialDirectory, ["README.md", ".git", gitProvider.getWorkflowFilesDirectoryName()]);
    const exporter = new PackageExporterByResourceType();
    await exporter.doExportFromIRI(iri, "", gitInitialDirectoryParent + "/", AvailableFilesystems.DS_Filesystem, AvailableExports.Filesystem, exportFormat ?? "json");

    const { givenRepositoryName, givenRepositoryUserName } = repositoryIdentificationInfo;

    const readmeData: ReadmeTemplateData = {
      dataspecerUrl: "http://localhost:5174",
      publicationRepositoryUrl: `${gitProvider.getDomainURL(true)}/${givenRepositoryUserName}/${givenRepositoryName}-publication-repo`,  // TODO RadStr: Have to fix once we will use better mechanism to name the publication repos
    };


    if (!hasSetLastCommit) {
      createReadmeFile(gitInitialDirectory, readmeData);
      gitProvider.copyWorkflowFiles(gitInitialDirectory);
    }
  }
  catch(error) {
    console.error("Failure when creating the export of repository for commit");
    removePathRecursively(gitDirectoryToRemoveAfterWork);
    throw error;
  }
}

type CloneBeforeMergeResult = {
  mergeFromBranchExists: boolean;
  mergeToBranchExists: boolean;
  mergeToBranchExplicitName: string;
  isClonedSuccessfully: boolean;
}

function isBranchPresentInBranchList(branches: BranchSummary, branch: string) {
  // We have to look for remotes of matching branch name. Because in git the local branch is not visible unless it was previously checkouted.
  const mergeFromBranchAsRemote = "remotes/origin/" + branch;
  const branchExists = branches.all.find(currBranch => mergeFromBranchAsRemote === currBranch) !== undefined;
  return branchExists;
}

async function checkoutBranchIfExists(git: SimpleGit, branches: BranchSummary, branch: string): Promise<boolean> {
  const branchExists = isBranchPresentInBranchList(branches, branch);
  if (branchExists) {
    await git.checkout(branch);
  }
  else {
    throw new Error("TODO RadStr: This is wrong. We have to create new branch from the other package content. If we ran just the git.branch([mergeFromBranch]), then we create branch with the same exact content as mergeTo. Which we do not want. We want mergeFrom");
    await git.checkoutLocalBranch(branch);
  }

  return branchExists;
}

/**
 * Note that switches to the {@link mergeToBranch}
 */
async function cloneBeforeMerge(
  git: SimpleGit,
  gitInitialDirectory: string,
  repoURLWithAuthorization: string,
  mergeFromBranch: string,
  mergeToBranch: string | null,
  isLastAccessToken: boolean
): Promise<CloneBeforeMergeResult> {
  let cloneResult: CloneBeforeMergeResult;
  let mergeFromBranchExists: boolean = false;
  let mergeToBranchExists: boolean = false;

  try {
    // Just clone it full, we could perform some optimizations though, but merging is rare operation anyways
    await gitCloneBasic(git, gitInitialDirectory, repoURLWithAuthorization, false, false, undefined);
    const branches = await git.branch();

    if (mergeToBranch === null) {
      mergeToBranchExists = true;
    }
    else {
      mergeToBranchExists = await checkoutBranchIfExists(git, branches, mergeToBranch);
    }
    const mergeToBranchExplicitName = (await git.branch()).current;


    const currentBranch = (await git.branch()).current;
    mergeFromBranchExists = await checkoutBranchIfExists(git, branches, mergeFromBranch);
    await git.checkout(currentBranch);      // Go back to the mergeToBranch

    cloneResult = {
      mergeFromBranchExists,
      mergeToBranchExists,
      mergeToBranchExplicitName: mergeToBranchExplicitName,
      isClonedSuccessfully: true,
    };
  }
  catch(error) {
    cloneResult = {
      mergeFromBranchExists,
      mergeToBranchExists,
      mergeToBranchExplicitName: "",    // We failed anyways, so no need to provide correct value if it is present
      isClonedSuccessfully: false,
    };
  }

  if (isLastAccessToken && !cloneResult.isClonedSuccessfully) {
    throw new Error("Clone for merge failed for the last access token to check.");
  }

  return cloneResult;
}

async function cloneBeforeCommit(
  git: SimpleGit,
  gitInitialDirectory: string,
  repoURLWithAuthorization: string,
  branch: string | null,
  localLastCommitHash: string,
  hasSetLastCommit: boolean,
  isLastAccessToken: boolean
): Promise<{ isNewlyCreatedBranchInDS: boolean, isCloneSuccessful: boolean }> {
  let isNewlyCreatedBranchInDS = false;

  try {
    await gitCloneBasic(git, gitInitialDirectory, repoURLWithAuthorization, true, false, branch ?? undefined);
  }
  catch (cloneError: any) {
    try {
      // It is possible that the branch is newly created inside DS.
      // It is newly possible (since Git 2.49 from March 2025) to easily fetch specific commit using git options
      // https://stackoverflow.com/questions/31278902/how-to-shallow-clone-a-specific-commit-with-depth-1
      if (hasSetLastCommit) {
        const options = [
          "--depth", "1",
          "--revision", localLastCommitHash,
        ];
        await git.clone(repoURLWithAuthorization, ".", options);
        isNewlyCreatedBranchInDS = true;
      }
      else {
        // Just try to get whole history and hopefully it will work.
        await git.clone(repoURLWithAuthorization, ".");
      }
      if (branch !== null) {
        await git.checkoutLocalBranch(branch);
      }
    }
    catch(cloneError2: any)  {
      if (isLastAccessToken) {
        throw cloneError2;       // Every access token failed
      }
      return {
        isNewlyCreatedBranchInDS,
        isCloneSuccessful: false,
      };
    }
  }

  return {
    isNewlyCreatedBranchInDS,
    isCloneSuccessful: true,
  };
}

/**
 * Performs the git add and git commit with given {@link commitMessage}
 * Expects the {@link git} to be on correct branch.
 * @param files - Items can be both files and directories
 */
async function createClassicGitCommit(
  git: SimpleGit,
  files: string[],
  commitMessage: string,
  committerName: string,
  committerEmail: string,
) {
  await git.add(files);
  await setUserConfigForGitInstance(git, committerName, committerEmail);

  // We should already be on the correct branch
  const commitResult = await git.commit(commitMessage);
  return commitResult;
}

async function createMergeCommit(
  git: SimpleGit,
  files: string[],
  mergeDefaultCommitMessage: string,
  commitMessage: string,
  committerName: string,
  committerEmail: string,
  mergeFromBranchName: string,
) {
  // TODO RadStr: Trying the following idea:
  // 1) Create merge state in git using git merge --no-ff
  //   - This tries merging, but never creates the actual merge commit
  // 2) Only reason why we did that is the get the default merge commit message, we get that from ".git/MERGE_MSG"
  // 3) Then we abort using --abort option
  // 4) Now to actally create the merge:
  //  a) Create normal commit
  //  b) Turn that commit into merge commit
  //  c) Modify the commit message
  // ... At first I thought that it is enough to use merge -s ours, however that does not consider staged file
  // ... Other alternative would be to Run "git merge --no-ff", remove the content of repository as we do. Then put in the new exported content and run git commit.
  // First we commit the current content of the repository

  console.info("Status before:");
  console.info(await git.status());
  await git.add(files);
  console.info("Status after add:");
  console.info(await git.status());
  await setUserConfigForGitInstance(git, committerName, committerEmail);
  await git.commit(mergeDefaultCommitMessage);
  const lastCommitMessage = (await getLastCommit(git))?.message ?? "";
  // Modify the message ... it keeps the old default text, but adds the new one
  // The --no-edit option is not needed since we provide the commit message explictly (othwerise the option ensures not open editor for the amend)
  return await git.commit([mergeDefaultCommitMessage, commitMessage], undefined, { "--amend": null, });
}

async function setUserConfigForGitInstance(git: SimpleGit, committerName: string, committerEmail: string) {
  const committerNameToUse = committerName;
  const committerEmailToUse = committerEmail;
  await git.addConfig("user.name", committerNameToUse);
  await git.addConfig("user.email", committerEmailToUse);
}