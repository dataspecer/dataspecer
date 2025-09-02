import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { resourceModel } from "../main.ts";


import { LanguageString } from "@dataspecer/core/core/core-resource";


import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import { BaseResource, ResourceModel } from "../models/resource-model.ts";
import { v4 as uuidv4 } from 'uuid';
import { currentVersion } from "../tools/migrations/index.ts";
import configuration from "../configuration.ts";

import fs from "fs";
import { getRepoURLWithAuthorization, getRepoURLWithAuthorizationUsingDebugPatToken } from "../git-never-commit.ts";
import { simpleGit, SimpleGit } from "simple-git";
import { extractPartOfRepositoryURL } from "../utils/git-utils.ts";
import { GitCredentials, GitProvider } from "@dataspecer/git";
import { GitProviderFactory } from "../git-providers/git-provider-base.ts";

import YAML from "yaml";
import { createUniqueCommitMessage } from "../utils/git-utils.ts";
import { getGitCredentialsFromSessionWithDefaults } from "../authorization/auth-session.ts";
import { ConfigType } from "../authorization/auth-config.ts";
import { createReadmeFile } from "../git-readme/readme-generator.ts";
import { ReadmeTemplateData } from "../git-readme/readme-template.ts";
import { PackageExporterByResourceType } from "../export-import/export-by-resource-type.ts";
import { AvailableExports } from "../export-import/export-actions.ts";
import { createSimpleGit, gitCloneBasic } from "../utils/simple-git-utils.ts";
import { AvailableFilesystems } from "../export-import/filesystem-abstractions/backend-filesystem-abstraction-factory.ts";




//////////////////////////////////
//////////////////////////////////
// TODO: Based on exportPackageResource, just to have proof-of-concept
//////////////////////////////////
//////////////////////////////////

function getName(name: LanguageString | undefined, defaultName: string) {
  return name?.["cs"] || name?.["en"] || defaultName;
}

/**
 * Commit to the repository for package identifier by given iri inside the query part of express http request.
 */
export const commitPackageToGitHandler = asyncHandler(async (request: express.Request, response: express.Response) => {
  const querySchema = z.object({
    iri: z.string().min(1),
    commitMessage: z.string(),
  });

  const query = querySchema.parse(request.query);

  const iri = query.iri;
  const commitMessage = query.commitMessage.length === 0 ? null : query.commitMessage;
  const resource = await resourceModel.getResource(iri);
  if (resource === null) {
    // TODO RadStr: Better error handling
    console.error("Can not commit to Git since the resource does not exist");
    return;
  }
  const gitLink = resource.linkedGitRepositoryURL;

  // TODO: Also kind of copy paste of the error boundaries for userName and repoName from the createPackageFromExistingGitRepository
  const userName = extractPartOfRepositoryURL(gitLink, "user-name");
  const repoName = extractPartOfRepositoryURL(gitLink, "repository-name");

  if (repoName === null) {
    // TODO RadStr: Better error handling
    console.error("Repository name could not be extracted from the repository URL");
    return;
  }
  if (userName === null) {
    // TODO RadStr: Better error handling
    console.error("User name could not be extracted from the repository URL");
    return;
  }

  const branch = resource.branch === "main." ? null : resource.branch;
  commitPackageToGitUsingAuthSession(iri, gitLink, branch, resource.lastCommitHash, userName, repoName, commitMessage, response);
});


/**
 * Gets authorization information from current session (if someting is missing use default bot credentials)
 *  and uses that information for the commit.
 */
export const commitPackageToGitUsingAuthSession = async (
  iri: string,
  remoteRepositoryURL: string,
  branch: string | null,
  lastCommitHash: string,
  givenRepositoryUserName: string,
  givenRepositoryName: string,
  commitMessage: string | null,
  response: express.Response,
  gitProvider?: GitProvider,
) => {
  // If gitProvider not given - get it
  gitProvider ??= GitProviderFactory.createGitProviderFromRepositoryURL(remoteRepositoryURL);

  const committer = getGitCredentialsFromSessionWithDefaults(gitProvider, response, [ConfigType.FullPublicRepoControl, ConfigType.DeleteRepoControl]);
  commitPackageToGit(iri, remoteRepositoryURL, branch, lastCommitHash, givenRepositoryUserName, givenRepositoryName, committer, commitMessage, gitProvider);
}


// TODO RadStr: Teoreticky bych mohl mit defaultni commit message ulozenou v konfiguraci (na druhou stranu vzdy chci zadat nejakou commit message)
/**
 * Commit to the repository for package identifier by given iri.
 * @param commitMessage if null then default message is used.
 */
export const commitPackageToGit = async (
  iri: string,
  remoteRepositoryURL: string,
  branch: string | null,
  lastCommitHash: string,
  givenRepositoryUserName: string,
  givenRepositoryName: string,
  committer: GitCredentials,
  commitMessage: string | null,
  gitProvider: GitProvider,
) => {
  if (commitMessage === null) {
    commitMessage = createUniqueCommitMessage();
  }

  // TODO RadStr: ... If we fail, then we should try to commit using bot credentials + We should also report the issue
  const repoURLWithAuthorization = getRepoURLWithAuthorization(remoteRepositoryURL, committer.name, givenRepositoryUserName, givenRepositoryName, committer.accessToken);
  // TODO RadStr: Remove the following line - just the old debug variant
  // const repoURLWithAuthorization = getRepoURLWithAuthorizationUsingDebugPatToken(remoteRepositoryURL, givenRepositoryName);

  // Up until here same as exportPackageResource except for own implementation of PackageExporter, now just commit and push
  const { git, gitInitialDirectory, gitInitialDirectoryParent, gitDirectoryToRemoveAfterWork } = createSimpleGit(iri, "commit-package-to-git-dir", branch ?? undefined);

  try {
    await gitCloneBasic(git, gitInitialDirectory, repoURLWithAuthorization, true, false, branch ?? undefined, 1);
  }
  catch (cloneError: any) {
    const hasSetLastCommit: boolean = lastCommitHash !== "";

    try {
      // It is possible that the branch is newly created inside DS.
      // It is newly possible (since Git 2.49 from March 2025) to easily fetch specific commit using git options
      // https://stackoverflow.com/questions/31278902/how-to-shallow-clone-a-specific-commit-with-depth-1
      if (hasSetLastCommit) {
        const options = [
          "--depth", "1",
          "--revision", lastCommitHash,
        ];
        await git.clone(repoURLWithAuthorization, ".", options);
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
      console.error("Can not clone repository before commiting from DS", cloneError, cloneError2);
      fs.rmSync(gitDirectoryToRemoveAfterWork, { recursive: true, force: true });
      throw cloneError2;    // Just rethrow the error
    }
  }

  try {
    const exporter = new PackageExporterByResourceType();
    await exporter.doExportFromIRI(iri, "", gitInitialDirectoryParent + "/", AvailableFilesystems.DS_Filesystem, AvailableExports.Filesystem);

    const readmeData: ReadmeTemplateData = {
      dataspecerUrl: "http://localhost:5174",
      publicationRepositoryUrl: `${gitProvider.getDomainURL(true)}/${givenRepositoryUserName}/${givenRepositoryName}-publication-repo`,  // TODO RadStr: Have to fix once we will use better mechanism to name the publication repos
    };
    createReadmeFile(gitInitialDirectory, readmeData);      // TODO RadStr: Again - should be done only in the initial commit

    gitProvider.copyWorkflowFiles(gitInitialDirectory);

    const commitResult = await commitGivenFilesToGit(git, ["."], commitMessage, committer.name, committer.email);
    await git.push(repoURLWithAuthorization);
    await resourceModel.updateLastCommitHash(iri, commitResult.commit);

    // It is important to not only remove the actual files, but also the .git directory,
    // otherwise we would later also push the git history, which we don't want (unless we get the history through git clone)
  }
  finally {
    fs.rmSync(gitDirectoryToRemoveAfterWork, { recursive: true, force: true });
  }

    // TODO RadStr: REMOVE THIS !!! (even though it really does not matter since user can't access server logs)
    // console.info("PUSHING USING", repoURLWithAuthorization);
    // console.info("BOT PAT TOKEN is as follows", GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN);
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
  // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token)
  // console.info("Current worktree", currentWorktree);
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
  // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token)
  // console.info("Commit status before: ", await git.status());
  await git.add(files);
  // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token)
  // console.info("Commit status after: ", await git.status());
  const committerNameToUse = committerName;
  const committerEmailToUse = committerEmail;
  await git.addConfig("user.name", committerNameToUse);
  await git.addConfig("user.email", committerEmailToUse);

  // We should already be on the correct branch
  return await git.commit(commitMessage);
}


/**
 * @deprecated Can be safely removed - It was Replaced by new implementation of PackageExporter using resource types (also implemented the variant without types)
 */
export class PackageExporterToFileSystem {
  resourceModel: ResourceModel;

  constructor(resourceModel: ResourceModel) {
    this.resourceModel = resourceModel;
  }

  async doExport(iri: string, startDirectory: string): Promise<void> {
    await this.exportResource(iri, "", startDirectory);
  }

  // TODO: Added startDirectory but it is not nice - since startDirectory is something which has purpose only on the first call and not in the subsequent recursive ones.
  private async exportResource(iri: string, path: string, startDirectory: string) {
    const resource = (await this.resourceModel.getResource(iri))!;

    let localNameCandidate = iri;
    if (iri.startsWith(path)) {
      localNameCandidate = iri.slice(path.length);
    }
    if (localNameCandidate.includes("/") || localNameCandidate.length === 0) {
      localNameCandidate = uuidv4();
    }
    let fullName = startDirectory + path + localNameCandidate;

    console.info("resource.types.includes(LOCAL_PACKAGE)", resource, iri, startDirectory);
    if (resource.types.includes(LOCAL_PACKAGE)) {
      if(!fs.existsSync(fullName)) {
        console.info("Creating directory: ", fullName);
        fs.mkdirSync(fullName);
      }
      fullName += "/"; // Create directory

      const pckg = (await this.resourceModel.getPackage(iri))!;

      for (const subResource of pckg.subResources) {
        await this.exportResource(subResource.iri, fullName, "");
      }
    }

    const metadata = this.constructMetadataFromResource(resource);
    this.writeBlob(fullName, "meta", metadata);

    for (const [blobName, storeId] of Object.entries(resource.dataStores)) {
      const data = await this.resourceModel.storeModel.getModelStore(storeId).getJson();
      const yamlData = YAML.stringify(data);
      // TODO RadStr: Commented code - remove later
      this.writeBlob(fullName, blobName, data);
      // this.writeYAMLBlob(fullName, blobName, yamlData);
    }
  }

  private constructMetadataFromResource(resource: BaseResource): object {
    return {
      iri: resource.iri,
      types: resource.types,
      userMetadata: resource.userMetadata,
      metadata: resource.metadata,
      _version: currentVersion,
      _exportVersion: 1,
      _exportedAt: new Date().toISOString(),
      _exportedBy: configuration.host,
    }
  }

  private writeBlob(iri: string, blobName: string, data: object) {
    const fullpath = iri + "." + blobName + ".json";
    fs.writeFileSync(fullpath, JSON.stringify(data));
  }

  private writeYAMLBlob(iri: string, blobName: string, yaml: string) {
    const fullpath = iri + "." + blobName + ".yaml";
    fs.writeFileSync(fullpath, yaml);
  }
}