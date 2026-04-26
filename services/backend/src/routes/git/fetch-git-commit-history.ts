import { z } from "zod";
import { asyncHandler } from "../../utils/async-handler.ts";
import { resourceModel } from "../../main.ts";
import express from "express";
import { GitRawHistoryToSendToClient, GitHistory, BranchHistory, RawCommit } from "@dataspecer/git";
import { createSimpleGitUsingPredefinedGitRoot, FETCH_GIT_HISTORY_PREFIX, gitCloneBasic, removePathRecursively } from "@dataspecer/git-node";

/**
 * Handles the client's request to get Git history of the project.
 * Sends back to the client the Git history using git command.
 * The history is in reverse chronological order (first the most recent and last the oldest).
 * The commit information has specific format and contains specific parts of the commit information. Look into the code for the format.
 */
export const fetchGitCommitHistory = asyncHandler(async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
        iri: z.string().min(1),
        historyDepth: z.number().optional()
    });


    const query = querySchema.parse(request.query);
    const resource = await resourceModel.getPackage(query.iri);
    if (resource === null) {
        response.status(404).send({ error: "Package does not exist." });
        return;
    }

    const gitURL = resource.linkedGitRepositoryURL;
    // Test URLs
    // const gitURL = "https://github.com/octocat/hello-world";
    // const gitURL = "https://github.com/nodejs/node-addon-examples";
    // const gitURL = "https://github.com/RadStr-bot/example-merge-repo";

    const { git, gitInitialDirectory, gitDirectoryToRemoveAfterWork } = createSimpleGitUsingPredefinedGitRoot(query.iri, FETCH_GIT_HISTORY_PREFIX, false);
    try {
        await gitCloneBasic(git, gitInitialDirectory, gitURL, false, true, undefined, query.historyDepth);


        // Note: We can not have composite formats - so for example have object author - and for it have name: "%an", email ... etc.
        const logFormat = {
            hash: "%H",
            parents: "%P",          // The commit parents are separated by " "
            commitMessage: "%s",
            authorName: "%an",
            authorEmail: "%ae",
            date: "%ai",

            refs: "%d",
            authorTimestamp: "%at",
            subject: "%s",
        };

        const customLogResult = await git.log({
            format: logFormat,
            "--all": null,
        });

        console.info("customLogResult", customLogResult);

        const jsonResponse: GitRawHistoryToSendToClient = {
            rawCommits: customLogResult.all,
        };
        response.json(jsonResponse);
    }
    catch(err) {
        console.info("Error either in git log or git clone", err);
        throw new Error("Error while trying to fetch git history: " + err);
    }
    finally {
        removePathRecursively(gitDirectoryToRemoveAfterWork);
    }
});

// Just for debug
/**
 * Test methods
 * @example Example Usage: createTestGitHistory([3, 4, 6])
 * @param commitCounts
 * @deprecated We are using the data from git log and not parse it ourselves (the commented code) like we used to
 */
function createTestGitHistory(commitCounts: number[]): GitHistory {
    const gitHistory: GitHistory = {
        branches: [],
        defaultBranch: `Branch 0-${commitCounts[0]}`,
    };

    let i = 0;
    for (const commitCount of commitCounts) {
        const branchName = `Branch ${i}-${commitCount}`
        const commits = createTestCommits(branchName, commitCount);
        const branch: BranchHistory = {
            name: branchName,
            commits,
        };

        gitHistory.branches.push(branch);
        i++;
    }

    return gitHistory;
}


/**
 * @deprecated for same reason as {@link createTestGitHistory}
 */
function createTestCommits(branchName: string, commitCount: number): RawCommit[] {
    const commits: RawCommit[] = [];
    for (let i = 0; i < commitCount; i++) {
        commits.push({
            authorName: `Author-${branchName}-${i}`,
            authorEmail: `Author-Email-${branchName}-${i}`,
            commitMessage: `Commit Message-${branchName}-${i}`,
            hash: `Hash-${branchName}-${i}`,
            date: i.toString(),
            authorTimestamp: i.toString(),
            parents: `Hash-${branchName}-${i-1}`,
            refs: "",
        });
    }

    return commits;
}
