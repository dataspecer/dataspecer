import { simpleGit, SimpleGit } from "simple-git";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

export async function getCommonCommitInHistory(git: SimpleGit, commit1: string, commit2: string): Promise<string | null> {
    try {
        const result = await git.raw([
            'merge-base',
            commit1,
            commit2
        ]);
        return result.trim(); // merge-base hash
    }
    catch (err) {
        console.error('Error finding merge-base:', err);
        return null;
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
     *Is the parent of the gitInitialDirectory. Ends with the branch anme
     */
    gitInitialDirectoryParent: string,
    /**
     * Is the {@link directoryBase} followed by /${iri}. This directory is always unique (it had to be created now)
     */
    gitInitialDirectory: string,
}

export type SimpleGitUniqueInitialDirectory = UniqueDirectory & {
    /**
     * Is initiated instance of git with the {@link gitInitialDirectory}.
     */
    git: SimpleGit,
}


export const createUniqueDirectory = (
    iri: string,
    cloneDirectoryNamePrefix: string,
    branch?: string,
): UniqueDirectory => {
    const branchSuffix = branch === undefined ? "" : `/${branch}`;

    while (true) {
        const pathUuid = uuidv4();

        const gitInitialDirectoryParent = `./${cloneDirectoryNamePrefix}/${pathUuid}${branchSuffix}`;
        let gitInitialDirectory = `${gitInitialDirectoryParent}/${iri}`;
        // We check for parent just to be sure, howevere it is highly unlikely that there was conflict.
        if (!fs.existsSync(gitInitialDirectoryParent)) {
            fs.mkdirSync(gitInitialDirectory, { recursive: true });
            return {
                gitInitialDirectoryParent,
                gitInitialDirectory,
            };
        }
    }
}


export const createSimpleGit = (
    iri: string,
    cloneDirectoryNamePrefix: string,
    branch?: string,
): SimpleGitUniqueInitialDirectory => {
    const uniqueDirectory = createUniqueDirectory(iri, cloneDirectoryNamePrefix, branch);
    const git = simpleGit(uniqueDirectory.gitInitialDirectory);
    return {
        ...uniqueDirectory,
        git,
    };
}