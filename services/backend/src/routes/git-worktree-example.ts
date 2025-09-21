import { simpleGit } from "simple-git";
import { getRepoURLWithAuthorizationUsingDebugPatToken } from "../git-never-commit.ts";
import fs from "fs";

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

  const repoURLWithAuthorization = getRepoURLWithAuthorizationUsingDebugPatToken(remoteRepositoryURL, repoName);
  // Up until here same as exportPackageResource except for own implementation of PackageExporter, now just commit and push

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