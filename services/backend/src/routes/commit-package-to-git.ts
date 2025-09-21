import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { mergeStateModel, resourceModel } from "../main.ts";

import fs from "fs";
import { CommitResult, SimpleGit } from "simple-git";
import { checkErrorBoundaryForCommitAction, extractPartOfRepositoryURL, getAuthorizationURL, getLastCommit, getLastCommitHash, removeEverythingExcept } from "../utils/git-utils.ts";
import { AvailableFilesystems, ConfigType, GitProvider, GitCredentials, getMergeFromMergeToForGitAndDS } from "@dataspecer/git";
import { GitProviderFactory } from "../git-providers/git-provider-factory.ts";

import { createUniqueCommitMessage } from "../utils/git-utils.ts";
import { getGitCredentialsFromSessionWithDefaults } from "../authorization/auth-session.ts";
import { createReadmeFile } from "../git-readme/readme-generator.ts";
import { ReadmeTemplateData } from "../git-readme/readme-template.ts";
import { AvailableExports } from "../export-import/export-actions.ts";
import { createSimpleGit, getCommonCommitInHistory, gitCloneBasic } from "../utils/simple-git-utils.ts";
import { compareGitAndDSFilesystems } from "../export-import/filesystem-abstractions/backend-filesystem-comparison.ts";
import { MERGE_DS_CONFLICTS_PREFIX, PUSH_PREFIX } from "../models/git-store-info.ts";
import { PackageExporterByResourceType } from "../export-import/export-by-resource-type.ts";


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
  const commitResult = await commitPackageToGitUsingAuthSession(
    request, iri, gitLink, branch, resource.lastCommitHash, resource.mergeFromBranch, resource.mergeFromHash,
    userName!, repoName!, commitMessage, response, query.exportFormat ?? null);

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
  branch: string | null,
  localLastCommitHash: string,
  mergeFromBranch: string,
  mergeFromCommitHash: string,
  givenRepositoryUserName: string,
  givenRepositoryName: string,
  commitMessage: string | null,
  response: express.Response,
  exportFormat: string | null,
  gitProvider?: GitProvider,
) => {
  // If gitProvider not given - get it
  gitProvider ??= GitProviderFactory.createGitProviderFromRepositoryURL(remoteRepositoryURL);
  const committer = getGitCredentialsFromSessionWithDefaults(gitProvider, request, response, [ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl]);
  return await commitPackageToGit(
    iri, remoteRepositoryURL, branch, localLastCommitHash, mergeFromBranch, mergeFromCommitHash,
    givenRepositoryUserName, givenRepositoryName, committer, commitMessage, gitProvider, exportFormat);
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
  branch: string | null,
  localLastCommitHash: string,
  mergeFromBranch: string,
  mergeFromCommitHash: string,
  givenRepositoryUserName: string,
  givenRepositoryName: string,
  gitCredentials: GitCredentials,
  commitMessage: string | null,
  gitProvider: GitProvider,
  exportFormat: string | null,
): Promise<boolean> => {
  if (commitMessage === null) {
    commitMessage = createUniqueCommitMessage();
  }

  // Note that the logic for both is similiar create git, clone, check if should create merge state conflict, perform export and "force" push.
  if (mergeFromCommitHash === "") {
    return await commitClassicToGit(
      iri, remoteRepositoryURL, branch, localLastCommitHash, givenRepositoryUserName,
      givenRepositoryName, gitCredentials, commitMessage, gitProvider, exportFormat);
  }
  else {
    return await commitDSMergeToGit(
      iri, remoteRepositoryURL, givenRepositoryUserName, givenRepositoryName,
      commitMessage, exportFormat, gitProvider, gitCredentials,
      mergeFromBranch, mergeFromCommitHash, branch, localLastCommitHash);
  }
};



async function commitDSMergeToGit(
  iri: string,
  remoteRepositoryURL: string,
  givenRepositoryUserName: string,
  givenRepositoryName: string,
  commitMessage: string,
  exportFormat: string | null,
  gitProvider: GitProvider,
  gitCredentials: GitCredentials,

  mergeFromBranch: string,
  mergeFromCommit: string,
  mergeToBranch: string | null,
  mergeToCommit: string,
): Promise<boolean> {
  // Note that the logic follows the commit method logic - create git, clone, check if should create merge state conflict, perform export and "force" merge/push.

  const { git, gitInitialDirectory, gitInitialDirectoryParent, gitDirectoryToRemoveAfterWork } = createSimpleGit(iri, MERGE_DS_CONFLICTS_PREFIX);

  for (const accessToken of gitCredentials.accessTokens) {

    const repoURLWithAuthorization = getAuthorizationURL(gitCredentials, accessToken, remoteRepositoryURL, givenRepositoryUserName, givenRepositoryName);
    const isLastAccessToken = accessToken === gitCredentials.accessTokens.at(-1);

    const hasSetLastCommit: boolean = mergeToCommit !== "";


    const cloneResult = await cloneBeforeMerge(git, gitInitialDirectory, repoURLWithAuthorization, mergeFromBranch, mergeToBranch, isLastAccessToken);
    if (!cloneResult.isClonedSuccessfully) {
      continue;
    }
    const mergeToBranchExplicit: string = (await git.branch()).current;

    const mergeFromBranchLog = await git.log([mergeFromBranch]);
    const lastMergeFromBranchCommitInGit = mergeFromBranchLog.latest?.hash;
    const shouldTryCreateMergeState = lastMergeFromBranchCommitInGit !== mergeFromCommit;

    if (shouldTryCreateMergeState) {
      const {
        diffTreeComparisonResult,
        rootMergeFrom,
        pathToRootMetaMergeFrom,
        filesystemMergeFrom,
        rootMergeTo,
        pathToRootMetaMergeTo,
        filesystemMergeTo,
      } = await compareGitAndDSFilesystems(gitProvider, iri, gitInitialDirectoryParent, "merge");

      const commonCommitHash = await getCommonCommitInHistory(git, mergeFromCommit, mergeToCommit);

      const createdMergeStateId = await mergeStateModel.createMergeStateIfNecessary(
        iri, "merge", diffTreeComparisonResult,
        mergeFromCommit, mergeToCommit, commonCommitHash,
        rootMergeFrom, pathToRootMetaMergeFrom, filesystemMergeFrom.getFilesystemType(),
        rootMergeTo, pathToRootMetaMergeTo, filesystemMergeTo.getFilesystemType());
      if (createdMergeStateId !== null) {
        return false;
      }
      // Well now what? For some reason the merge state was not created, but I think that it always should be, since we are not matching the commit hashes.
      // Actually if we commit and then revert then we don't get conflicts
    }


    // If the merge from does not exist in git - push it
    if (!cloneResult.mergeFromBranchExists) {
      await git.checkout(mergeFromBranch);
      await git.push(repoURLWithAuthorization);
      await git.checkout(mergeToBranchExplicit);
    }

    const pushResult = await exportAndPushToGit(
      git, iri, repoURLWithAuthorization, gitInitialDirectory, gitInitialDirectoryParent, gitDirectoryToRemoveAfterWork,
      givenRepositoryUserName, givenRepositoryName, gitCredentials, commitMessage, gitProvider, exportFormat, hasSetLastCommit, mergeFromBranch, isLastAccessToken);
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
  givenRepositoryUserName: string,
  givenRepositoryName: string,
  gitCredentials: GitCredentials,
  commitMessage: string,
  gitProvider: GitProvider,
  exportFormat: string | null,
) {
  const { git, gitInitialDirectory, gitInitialDirectoryParent, gitDirectoryToRemoveAfterWork } = createSimpleGit(iri, PUSH_PREFIX);

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

          const commonCommitHash = await getCommonCommitInHistory(git, localLastCommitHash, remoteRepositoryLastCommitHash);
          const { valueMergeFrom: lastHashMergeFrom, valueMergeTo: lastHashMergeTo } = getMergeFromMergeToForGitAndDS("push", localLastCommitHash, remoteRepositoryLastCommitHash);
          const createdMergeStateId = await mergeStateModel.createMergeStateIfNecessary(
            iri, "push", diffTreeComparisonResult,
            lastHashMergeFrom, lastHashMergeTo, commonCommitHash,
            rootMergeFrom, pathToRootMetaMergeFrom, filesystemMergeFrom.getFilesystemType(),
            rootMergeTo, pathToRootMetaMergeTo, filesystemMergeTo.getFilesystemType());
          if (createdMergeStateId !== null) {
            return false;
          }
        }
      }
      catch(error) {
        // Remove only on failure, otherwise there is conflict and we want to keep it for merge state
        fs.rmSync(gitDirectoryToRemoveAfterWork, { recursive: true, force: true });
        throw error;      // Rethrow
      }
    }

    const pushResult = await exportAndPushToGit(
      git, iri, repoURLWithAuthorization, gitInitialDirectory, gitInitialDirectoryParent, gitDirectoryToRemoveAfterWork,
      givenRepositoryUserName, givenRepositoryName, gitCredentials, commitMessage, gitProvider, exportFormat, hasSetLastCommit, null, isLastAccessToken);
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
  git: SimpleGit,
  iri: string,
  repoURLWithAuthorization: string,
  gitInitialDirectory: string,
  gitInitialDirectoryParent: string,
  gitDirectoryToRemoveAfterWork: string,
  givenRepositoryUserName: string,
  givenRepositoryName: string,
  gitCredentials: GitCredentials,
  commitMessage: string,
  gitProvider: GitProvider,
  exportFormat: string | null,
  hasSetLastCommit: boolean,
  mergeFromBranch: string | null,
  isLastAccessToken: boolean,
): Promise<boolean> {
  await fillGitDirectoryWithExport(
    iri, gitInitialDirectory, gitInitialDirectoryParent, gitDirectoryToRemoveAfterWork,
    gitProvider, exportFormat, givenRepositoryUserName, givenRepositoryName, hasSetLastCommit);

  try {
    let commitResult: CommitResult;
    if (mergeFromBranch === null) {
      commitResult = await createClassicGitCommit(git, ["."], commitMessage, gitCredentials.name, gitCredentials.email);
    }
    else {
      commitResult = await createMergeCommit(git, ["."], commitMessage, gitCredentials.name, gitCredentials.email, mergeFromBranch);
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
    fs.rmSync(gitDirectoryToRemoveAfterWork, { recursive: true, force: true });
  }
}


async function fillGitDirectoryWithExport(
  iri: string,
  gitInitialDirectory: string,
  gitInitialDirectoryParent: string,
  gitDirectoryToRemoveAfterWork: string,
  gitProvider: GitProvider,
  exportFormat: string | null,
  givenRepositoryUserName: string,
  givenRepositoryName: string,
  hasSetLastCommit: boolean,
) {
  try {
    // Remove the content of the git directory and then replace it with the export
    // Alternatively we could keep the content and run await git.rm(['-r', '.']) ... however that would to know exactly
    //  what files were exported. So we can add them explicitly instead of running git add .
    removeEverythingExcept(gitInitialDirectory, ["README.md", ".git", gitProvider.getWorkflowFilesDirectoryName()]);
    const exporter = new PackageExporterByResourceType();
    await exporter.doExportFromIRI(iri, "", gitInitialDirectoryParent + "/", AvailableFilesystems.DS_Filesystem, AvailableExports.Filesystem, exportFormat ?? "json");

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
    fs.rmSync(gitDirectoryToRemoveAfterWork, { recursive: true, force: true });
    throw error;
  }
}

type CloneBeforeMergeResult = {
  mergeFromBranchExists: boolean;
  mergeToBranchExists: boolean;
  isClonedSuccessfully: boolean;
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
      if (branches.all.includes(mergeToBranch)) {
        await git.checkout(mergeToBranch);
        mergeToBranchExists = true;
      }
      else {
        await git.checkoutLocalBranch(mergeToBranch);
        mergeToBranchExists = false;
      }
    }

    if (branches.all.includes(mergeFromBranch)) {
      mergeFromBranchExists = true;
    }
    else {
      mergeFromBranchExists = false;
      await git.branch([mergeFromBranch]);
    }

    cloneResult = {
      mergeFromBranchExists,
      mergeToBranchExists,
      isClonedSuccessfully: true,
    };
  }
  catch(error) {
    cloneResult = {
      mergeFromBranchExists,
      mergeToBranchExists,
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
  commitMessage: string,
  committerName: string,
  committerEmail: string,
  mergeFromBranchName: string,
) {
  await git.add(files);
  await setUserConfigForGitInstance(git, committerName, committerEmail);

  // We should already be on the correct branch
  // Put in the content of the mergeToBranch (that is the -s -ours)
  await git.merge([mergeFromBranchName, "-s", "ours"]);
  const lastCommitMessage = (await getLastCommit(git))?.message ?? "";
  // Modify the message ... it keeps the old default text, but adds the new one
  // The --no-edit option is not needed since we provide the commit message explictly (othwerise the option ensures not open editor for the amend)
  return await git.commit([commitMessage, lastCommitMessage], undefined, { "--amend": null, });
}

async function setUserConfigForGitInstance(git: SimpleGit, committerName: string, committerEmail: string) {
  const committerNameToUse = committerName;
  const committerEmailToUse = committerEmail;
  await git.addConfig("user.name", committerNameToUse);
  await git.addConfig("user.email", committerEmailToUse);
}