import { asyncHandler } from "../utils/async-handler.ts";

import express from "express";
import { simpleGit, SimpleGit } from "simple-git";

import fs from "fs"
import { GIT_RAD_STR_BOT_USERNAME, getRepoURLWithAuthorizationUsingDebugPatToken } from "../git-never-commit.ts";

/**
 * @deprecated Just initial version, which I used to learn how it works, but we will keep it for now
 */
export const tryCommitToGitRepo = asyncHandler(async (request: express.Request, response: express.Response) => {
  // const querySchema = z.object({
  //     iri: z.string().min(1),
  // });
  // const query = querySchema.parse(request.query);

  // const resource = await resourceModel.getResource(query.iri);

  // if (!resource) {
  //     response.sendStatus(404);
  //     return;
  // }

  // response.send(resource);

  const repoName = "test-gh-pages";
  const repoURL = `https://github.com/${GIT_RAD_STR_BOT_USERNAME}/${repoName}`;
  // Has to provide commit rights
  // TODO RadStr: Hardcoded github.com ... but the method is deprecated so it does not matter
  const repoURLWithAuthorization = getRepoURLWithAuthorizationUsingDebugPatToken(repoURL, repoName);

  const testDirectory = "./test-git-directory";

  const git = simpleGit(".");
  let gitFromTestDirectory: SimpleGit | null = null;

  if (fs.existsSync(testDirectory)) {
    fs.existsSync(testDirectory);
    console.log('Repo already cloned.');
    console.log('Removing repo.');
    fs.rmSync(testDirectory, { recursive: true, force: true });
    console.log('Cloning repo after removal...');
    const cloneResult = await git.clone(repoURL, testDirectory);
    gitFromTestDirectory = simpleGit("./test-git-directory");
    console.info("Clone Result: " + cloneResult);
    console.info("git status: " + JSON.stringify(await gitFromTestDirectory.status()));
    console.info("git log: " + JSON.stringify(await gitFromTestDirectory.log()));
  }
  else {
    console.log('Cloning repo...');
    await git.clone("https://github.com/RadStr/test-gh-pages.git", testDirectory);
    console.log('Repo cloned.');
  }


  // Collect git directory content
  let directoryContent = "Directory content:";
  const files = fs.readdirSync(testDirectory);
  files.forEach(file => directoryContent += " " + file);


  // Add, Commit, Push (using PAT token)
  if (gitFromTestDirectory !== null) {
    fs.writeFileSync(testDirectory + "/automatically-created-file", "Automatically created file content" + Date.now() + "\n");
    gitFromTestDirectory.addConfig("user.name", "GitHub Actions Bot");
    gitFromTestDirectory.addConfig("user.email", "github-actions[bot]@users.noreply.github.com");
    console.info("Config: ", await gitFromTestDirectory.listConfig());
    console.info("Current git status: ", JSON.stringify(await gitFromTestDirectory.status()));
    gitFromTestDirectory.add(["./automatically-created-file"]);
    gitFromTestDirectory.commit("Automatically commited through simple-git");
    const pushResult = await gitFromTestDirectory.push(repoURLWithAuthorization);

    // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token)
    // console.info("Push result", pushResult);
  }


  // Just print the content to the response - why is it empty?
  console.info("dirCOntent: ", directoryContent);
  response.type("text/plain");
  response.send(directoryContent);
  return;
});
