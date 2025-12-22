import { simpleGit } from "simple-git";
import fs from "fs";
import { GitProviderFactory } from "../git-providers/git-provider-factory.ts";
import { getAuthorizationURL } from "@dataspecer/git";
import { checkErrorBoundaryForCommitAction } from "@dataspecer/git-node";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-nodejs";
import configuration from "../configuration.ts";

/**
 * Example for git worktrees
 * @todo Can be removed since we do not use it. But it might be useful for some git trickery in future
 * @deprecated See the todo
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

  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(remoteRepositoryURL, httpFetch, configuration);
  const botCredentials = gitProvider.getBotCredentials();
  if (botCredentials === null) {
    throw new Error("No bot credentials, can not create gitWorkTreeExample");
  }
  const remoteRepositoryRepoName = gitProvider.extractPartOfRepositoryURL(remoteRepositoryURL, "repository-name");
  const remoteRepositoryUserName = gitProvider.extractPartOfRepositoryURL(remoteRepositoryURL, "user-name");
  checkErrorBoundaryForCommitAction(remoteRepositoryURL, remoteRepositoryRepoName, remoteRepositoryUserName);
  const repoURLWithAuthorization = getAuthorizationURL(
    botCredentials, botCredentials.accessTokens[0], remoteRepositoryURL, remoteRepositoryUserName!, remoteRepositoryRepoName!);

  const git = simpleGit(gitInitialDirectory);
  try {
    await git.clone(repoURLWithAuthorization, ".");
    console.info("Cloned repo");
  }
  catch (cloneError) {
    console.error(`Error when cloning ${remoteRepositoryURL}`);
    await git.init();
    try {
      await git.pull(repoURLWithAuthorization);
    }
    catch (pullError) {
      throw new Error(`Error when pulling ${remoteRepositoryURL}`);
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