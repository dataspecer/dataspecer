import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { mergeStateModel, resourceModel } from "../main.ts";

import fs from "fs";
import { getRepoURLWithAuthorizationUsingDebugPatToken } from "../git-never-commit.ts";
import { simpleGit, SimpleGit } from "simple-git";
import { checkErrorBoundaryForCommitAction, extractPartOfRepositoryURL, getAuthorizationURL, getLastCommitHash, removeEverythingExcept } from "../utils/git-utils.ts";
import { AvailableFilesystems, ConfigType, GitProvider, GitCredentials, getMergeFromMergeToForGitAndDS } from "@dataspecer/git";
import { GitProviderFactory } from "../git-providers/git-provider-factory.ts";

import { createUniqueCommitMessage } from "../utils/git-utils.ts";
import { getGitCredentialsFromSessionWithDefaults } from "../authorization/auth-session.ts";
import { createReadmeFile } from "../git-readme/readme-generator.ts";
import { ReadmeTemplateData } from "../git-readme/readme-template.ts";
import { AvailableExports } from "../export-import/export-actions.ts";
import { createSimpleGit, getCommonCommitInHistory, gitCloneBasic } from "../utils/simple-git-utils.ts";
import { compareGitAndDSFilesystems } from "../export-import/filesystem-abstractions/backend-filesystem-comparison.ts";
import { PUSH_PREFIX } from "../models/git-store-info.ts";
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
    request, iri, gitLink, branch, resource.lastCommitHash, userName!,
    repoName!, commitMessage, response, query.exportFormat ?? null);

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
  return await commitPackageToGit(iri, remoteRepositoryURL, branch, localLastCommitHash, givenRepositoryUserName, givenRepositoryName, committer, commitMessage, gitProvider, exportFormat);
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
  const { git, gitInitialDirectory, gitInitialDirectoryParent, gitDirectoryToRemoveAfterWork } = createSimpleGit(iri, PUSH_PREFIX);
  for (const accessToken of gitCredentials.accessTokens) {
    const repoURLWithAuthorization = getAuthorizationURL(gitCredentials, accessToken, remoteRepositoryURL, givenRepositoryUserName, givenRepositoryName);
    const isLastAccessToken = accessToken === gitCredentials.accessTokens.at(-1);

    let isNewlyCreatedBranchInDS = false;

    const hasSetLastCommit: boolean = localLastCommitHash !== "";

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
        continue;
      }
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
          const createdMergeStateId = mergeStateModel.createMergeStateIfNecessary(
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

    try {
      const commitResult = await commitGivenFilesToGit(git, ["."], commitMessage, gitCredentials.name, gitCredentials.email);
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
      }
    }
    finally {
      // It is important to not only remove the actual files, but also the .git directory,
      // otherwise we would later also push the git history, which we don't want (unless we get the history through git clone)
      fs.rmSync(gitDirectoryToRemoveAfterWork, { recursive: true, force: true });
    }
  }

  throw new Error("Unknown error when commiting. This should be unreachable code. There were probably no access tokens available in DS at all");
};


/**
 * Example for git worktrees
 */
export const gitWorktreeExample = async (
  iri: string,
  remoteRepositoryURL: string,
  givenUserName: string,
  repoName: string
) => {
  const directoryWithContent = "./test-git-directory2";
  const gitInitialDirectory = `${directoryWithContent}/${iri}`;
  if(!fs.existsSync(directoryWithContent)) {
    fs.mkdirSync(directoryWithContent);
  }
  if(!fs.existsSync(gitInitialDirectory)) {
    fs.mkdirSync(gitInitialDirectory);
  }

  const repoURLWithAuthorization = getRepoURLWithAuthorizationUsingDebugPatToken(remoteRepositoryURL, repoName);
  // Up until here same as exportPackageResource except for own implementation of PackageExporter, now just commit and push

  const git = simpleGit(gitInitialDirectory);
  try {
    await git.clone(repoURLWithAuthorization, ".");
    console.info("Cloned repo");
  }
  catch (cloneError) {
    // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token)
    // console.info("Catched clone error: ", cloneError);
    await git.init();
    try {
      await git.pull(repoURLWithAuthorization);
    }
    catch (pullError) {
      // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token)
      // console.info("Catched pull error: ", pullError);
    }
  }

  let branches = await git.branch();
  console.log("Existing branches:", branches.all);
  await git.checkout("branch2");
  await git.checkout("main");
  branches = await git.branch();
  console.log("Existing branches:", branches.all);
  // Create the worktree for branch2

  // We can not remove the main worktree
  // await git.raw(['worktree', 'remove', "."]);

  // We can change the path to anything, for example "../../my-repo-branch2" to move away from the main worktree path
  await git.raw(['worktree', 'add', "./my-repo-branch2", 'branch2']);
  console.log(`Worktree for 'branch2' created at: ./my-repo-branch2`);
  const currentWorktree = await git.raw(['worktree', 'list']);
};

/**
 * Performs the git add and git commit with given {@link commitMessage}
 * Expects the {@link git} to be on correct branch.
 * @param files - Items can be both files and directories
 */
async function commitGivenFilesToGit(
  git: SimpleGit,
  files: string[],
  commitMessage: string,
  committerName: string,
  committerEmail: string,
) {
  await git.add(files);
  const committerNameToUse = committerName;
  const committerEmailToUse = committerEmail;
  await git.addConfig("user.name", committerNameToUse);
  await git.addConfig("user.email", committerEmailToUse);

  // We should already be on the correct branch
  return await git.commit(commitMessage);
}
