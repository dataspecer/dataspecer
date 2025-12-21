import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { resourceModel } from "../main.ts";
import express from "express";

import { createSimpleGit, gitCloneBasic } from "../utils/simple-git-utils.ts";
import { GitRawHistoryToSendToClient, GitHistory, BranchHistory, RawCommit } from "@dataspecer/git";
import { removePathRecursively, FETCH_GIT_HISTORY_PREFIX } from "@dataspecer/git-node";


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

    const { git, gitInitialDirectory, gitDirectoryToRemoveAfterWork } = createSimpleGit(query.iri, FETCH_GIT_HISTORY_PREFIX, false);

    try {
        await gitCloneBasic(git, gitInitialDirectory, gitURL, false, true, undefined, query.historyDepth);

        // const defaultbranchGit = await git.branch(["-vv"]);
        // const defaultBranchLabel = defaultbranchGit.branches[defaultbranchGit.current].label;
        // const defaultBranchName = defaultBranchLabel.substring(1, defaultBranchLabel.indexOf("]"));     // Inside the [] there is tracked branch - that is the remote to use
        // console.info({defaultBranchLabel, defaultBranch: defaultBranchName});

        // const gitHistory: GitHistory = {
        //     branches: [],
        //     defaultBranch: defaultBranchName,
        // };

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
        // let firstCommit: any | null = null;

        // const remoteBranches = await git.branch(["--remotes"]);
        // for (const remoteBranch of remoteBranches.all) {
        //     // const branchLog = await git.log([remoteBranch]);
        //     const firstCommitHash = await git.firstCommit();
        //     const branchLog = await git.log({
        //         // from: "^",      // This throws error for some reason
        //         from: firstCommitHash,      // As in https://www.npmjs.com/package/simple-git git log part ... however the first commit is not included
        //         to: remoteBranch,
        //         format: logFormat,
        //     });

        //     // We have to solve the first commit explicitly by hack
        //     if (firstCommit === null) {
        //         const rawFirstCommitFromLog = await git.log([firstCommitHash]);
        //         if (rawFirstCommitFromLog.latest?.hash === undefined) {
        //             // There is not even a first commit in the repo
        //             throw new Error("Not a single commit in the repo");
        //         }

        //         firstCommit = {
        //             hash: rawFirstCommitFromLog.latest?.hash,
        //             authorName: rawFirstCommitFromLog.latest?.author_name,
        //             authorEmail: rawFirstCommitFromLog.latest?.author_email,
        //             commitMessage: rawFirstCommitFromLog.latest?.message,
        //             date: rawFirstCommitFromLog.latest?.date,
        //             parents: "",
        //         };
        //     }

        //     console.info({branchLog});
        //     // TODO RadStr checked: Now it is just debug, the transforamtion itself is identity, we can jsut use branchLog.all
        //     const commits = branchLog.all.map(commit => {
        //         console.info({commit});
        //         return {
        //             hash: commit.hash,
        //             authorName: commit.authorName,
        //             authorEmail: commit.authorEmail,
        //             authorTimestamp: commit.authorTimestamp,
        //             commitMessage: commit.commitMessage,
        //             date: commit.date,
        //             parents: commit.parents,
        //             refs: commit.refs,
        //         }
        //     });

        //     gitHistory.branches.push({
        //         name: remoteBranch,
        //         commits: commits.concat(firstCommit),
        //     })
        // }

        // // const commits = log.all.map(commit => ({
        // //   hash: commit.hash,
        // //   authorName: commit.author_name,
        // //   authorEmail: commit.author_email,
        // //   commitMessage: commit.message,
        // // }));

        // const logGraph = await git.raw(["log", "--graph", "--oneline", "--all", "--format=%H"]);
        // console.info("logGraph", logGraph);

        // const mapBranchToHeadCommitRaw = await git.raw([
        //     "for-each-ref",
        //     "--format=%(refname:short) %(objectname)",
        //     "refs/remotes/"
        // ]);
        // const mapBranchToHeadCommitAsArray: string[] = mapBranchToHeadCommitRaw.split("\n");
        // const mapBranchToHeadCommit: Record<string, string> = {};
        // mapBranchToHeadCommitAsArray.forEach(keyAndvalue => {
        //     const [branch, commitHash] = keyAndvalue.split(" ");
        //     mapBranchToHeadCommit[branch] = commitHash;
        // });

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
