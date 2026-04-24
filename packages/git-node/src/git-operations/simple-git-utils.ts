import { simpleGit, SimpleGit } from "simple-git";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

/**
 * @throws Error on git failure
 * @returns The last common git commit's hash
 */
export async function getCommonCommitInHistory(git: SimpleGit, commit1: string, commit2: string): Promise<string> {
    try {
        const result = await git.raw([
            "merge-base",
            commit1,
            commit2
        ]);
        return result.trim(); // merge-base hash
    }
    catch(e) {
        // TODO RadStr Debug: Debug prints
        console.info(e);
        console.info(e?.message);
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
        throw e;
    }
}

/**
 * Performs git clone on {@link git}.
 * It expects the {@link git} object to be already initialized to the {@link gitInitialDirectory}.
 * @throws ON FAILURE THROWS ERROR. AND DOES NOT REMOVE THE DIRECTORY FROM FILESYSTEM.
 * @param gitInitialDirectory is the initial git directory, that is the directory with the ".git" directory,
 *  we actually don't need it (we could get it using git rev-parse --show-toplevel), we provide it for performance reason.
 * @param shouldFetchOnlyCommits If set to true then the parameters are set up in such a way that only the commit objects are fetched,
 *  everything else is fetched on demand. Which means this should not be used if we want to actually have the object to
 *  which the commits point (trees and blobs).
 */
export async function gitCloneBasic(
    git: SimpleGit,
    gitInitialDirectory: string,
    repositoryURL: string,
    fetchSingleBranch: boolean,
    shouldFetchOnlyCommits: boolean,
    branch?: string,
    depth?: number
) {
    // TODO: Compare SHAs (and maybe behave differently based on number of commits)
    console.info("Before cloning repo");
    // https://github.blog/open-source/git/get-up-to-speed-with-partial-clone-and-shallow-clone/ - The second one from quick summary - Treeless clone
    // Fetches just the commit history, all the other git objects are on-demand
    const gitCloneOptions = [];
    if (shouldFetchOnlyCommits) {
        gitCloneOptions.push("--filter=tree:0");
    }
    if (depth !== undefined) {
        gitCloneOptions.push("--depth", depth.toString());
    }
    if (fetchSingleBranch) {
        gitCloneOptions.push("--single-branch");
    }
    if (branch !== undefined) {
        // Note that this also moves to the branch after clone
        gitCloneOptions.push("--branch", branch);
    }
    await git.clone(repositoryURL, ".", gitCloneOptions);
}

export type UniqueDirectory = {
    /**
     * The path to directory, which should be removed after the git work.
     */
    gitDirectoryToRemoveAfterWork: string,

    /**
     *Is the parent of the gitInitialDirectory. Ends with the branch name
     */
    gitInitialDirectoryParent: string,
    /**
     * Is the {@link directoryBase} followed by /${iri}. This directory is always unique (it had to be created now)
     */
    gitInitialDirectory: string,
}

export type CreateSimpleGitResult = UniqueDirectory & {
    /**
     * Is initiated instance of git with the {@link gitInitialDirectory}.
     */
    git: SimpleGit,
}


export const createUniqueDirectory = (
    iri: string,
    cloneDirectoryNamePrefix: string,
    rootDirectoryForGit: string,
): UniqueDirectory => {
    // iri = encodeURIComponent(iri);
    console.info(iri.indexOf("http://"));           // TODO RadStr Debug: debug prints
    console.info(iri.indexOf("data"));
    console.info(iri.indexOf("dataspecer"));
    console.info(iri.indexOf("http"));
    let index = iri.indexOf("http://");
    if (index === -1) {
        index = iri.indexOf("https://");
    }
    if (index !== -1) {
        const pathStringToReplace = iri.substring(index);
        // TODO RadStr PR PathIRI: Maybe this should be called on the whole iri just to be sure
        iri = iri.substring(0, index) + toSafePath(pathStringToReplace);
    }
    while (true) {
        const uuidBase = uuidv4();
        // We have to cut the length as much as possible, because, aximum allowed length for path to the initial git repository
        //  (that is the directory which contains .git) is 215 characters,
        // which honestly does not seem right, since the maximum allowed length for Windows is 260 characters.
        // So if I had to guess then there is internal limit to 220 characters for the .git directory
        // Note that I tried both setting git long paths and windows long paths
        const pathUuid = uuidBase.substring(0, 6);
        const gitDirectoryToRemoveAfterWork = `${rootDirectoryForGit}/${cloneDirectoryNamePrefix}/${pathUuid}`;
        const gitInitialDirectoryParent = `${gitDirectoryToRemoveAfterWork}`;
        // Use the whole iri, but ideally we would take something like iri.substring(0, uuidBase.length - 6)
        let gitInitialDirectory = `${gitInitialDirectoryParent}/${iri}`;
        if (!fs.existsSync(gitDirectoryToRemoveAfterWork)) {
            fs.mkdirSync(gitInitialDirectory, { recursive: true });
            return {
                gitDirectoryToRemoveAfterWork,
                gitInitialDirectoryParent,
                gitInitialDirectory,
            };
        }
    }
}

/**
 * Generated by ChatGPT
 * Previously we used encodeURIComponent. However, if we pass that to the query part of URL, we do not know which part is encoded
 *  because of the query part and which because we do not to have the http or https IRIs as a part of path, so we convert using this method to make it a
 *  single directory instead of multiple ones (which would be caused by the existence of / in the iri)
 */
export function toSafePath(input: string): string {
  return input.replace(/[<>:"/\\|?*\s]+/g, "_");
}


/**
 * @param cloneDirectoryNamePrefix string since we want to also allow non-public repositories to be stored in ds. However check for the pulibc ones {@link AllowedPublicPrefixes}.
 * @param isPublicGit if true then the git is fetcheable and modifiable from client, otherwise not.
 */
export const createSimpleGit = (
    iri: string,
    cloneDirectoryNamePrefix: string,
    rootDirectoryForGit: string,
): CreateSimpleGitResult => {
    const uniqueDirectory = createUniqueDirectory(iri, cloneDirectoryNamePrefix, rootDirectoryForGit);
    const git = simpleGit(uniqueDirectory.gitInitialDirectory);
    return {
        ...uniqueDirectory,
        git,
    };
}
