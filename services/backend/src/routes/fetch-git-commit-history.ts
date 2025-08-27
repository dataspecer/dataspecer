import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { resourceModel } from "../main.ts";
import express from "express";
import { simpleGit } from "simple-git";

import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { gitCloneOnlyCommits } from "../utils/simple-git-utils.ts";

// TODO RadStr: On client the rawCommits don't have to be readonly here yes
type FetchedGitData = {
    rawCommits: readonly RawCommit[],
    logGraph: string,
}

type RawCommit = {
    hash: string,
    authorName: string,
    authorEmail: string,
    authorTimestamp: string,
    commitMessage: string,
    date: string,
    parents: string,
    refs: string,
}

type BranchHistory = {
  name: string;
  commits: RawCommit[];
}

type GitHistory = {
  branches: BranchHistory[];
  /**
   * The default branch - the branch you end up on when doing git clone - usually main/master, but may be develop
   */
  defaultBranch: string;
}


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

    // TODO RadStr: Just debug name
    const directoryName = `./TODO_RADSTR_DEBUG_DIRECTORY_NAME/${query.iri}/${uuidv4()}`;        // Without the id, we will run into errors and race conditions
                                                                                                // TODO RadStr: This is/will be issue on more places
    fs.mkdirSync(directoryName, { recursive: true });
    const git = simpleGit(directoryName);

    await gitCloneOnlyCommits(git, directoryName, gitURL, false, undefined, query.historyDepth);

    try {
        console.info("After cloning");
        // const log = await git.log();
        // console.info("log", {log});

        const defaultbranchGit = await git.branch(["-vv"]);
        const defaultBranchLabel = defaultbranchGit.branches[defaultbranchGit.current].label;
        const defaultBranchName = defaultBranchLabel.substring(1, defaultBranchLabel.indexOf("]"));     // Inside the [] there is tracked branch - that is the remote to use
        console.info({defaultBranchLabel, defaultBranch: defaultBranchName});

        const gitHistory: GitHistory = {
            branches: [],
            defaultBranch: defaultBranchName,
        };

        const logFormat = {
            hash: "%H",
            parents: "%P",          // The commit parents are separated by " "
            commitMessage: "%s",
            authorName: "%an",
            authorEmail: "%ae",
            date: "%ai",

            refs: "%d",
            // author: {                        // Does not work
            //     name: "%an",
            //     email: "%ae",
            //     timestamp: "%at",
            // },
            authorTimestamp: "%at",
            subject: "%s",
        };
        let firstCommit: any | null = null;

        const remoteBranches = await git.branch(["--remotes"]);
        for (const remoteBranch of remoteBranches.all) {
            // const branchLog = await git.log([remoteBranch]);
            const firstCommitHash = await git.firstCommit();
            const branchLog = await git.log({
                // from: "^",      // This throws error for some reason
                from: firstCommitHash,      // As in https://www.npmjs.com/package/simple-git git log part ... however the first commit is not included
                to: remoteBranch,
                format: logFormat,
            });

            // We have to solve the first commit explicitly by hack
            if (firstCommit === null) {
                const rawFirstCommitFromLog = await git.log([firstCommitHash]);
                if (rawFirstCommitFromLog.latest?.hash === undefined) {
                    // There is not even a first commit in the repo
                    throw new Error("Not a single commit in the repo");     // TODO RadStr: Once again, probably better error handling
                }

                firstCommit = {
                    hash: rawFirstCommitFromLog.latest?.hash,
                    authorName: rawFirstCommitFromLog.latest?.author_name,
                    authorEmail: rawFirstCommitFromLog.latest?.author_email,
                    commitMessage: rawFirstCommitFromLog.latest?.message,
                    date: rawFirstCommitFromLog.latest?.date,
                    parents: "",
                };
            }

            console.info({branchLog});
            // TODO RadStr: Now it is just debug, the transforamtion itself is identity, we can jsut use branchLog.all
            const commits = branchLog.all.map(commit => {
                console.info({commit});
                return {
                    hash: commit.hash,
                    authorName: commit.authorName,
                    authorEmail: commit.authorEmail,
                    authorTimestamp: commit.authorTimestamp,
                    commitMessage: commit.commitMessage,
                    date: commit.date,
                    parents: commit.parents,
                    refs: commit.refs,
                }
            });

            gitHistory.branches.push({
                name: remoteBranch,
                commits: commits.concat(firstCommit),
            })
        }

        // const commits = log.all.map(commit => ({
        //   hash: commit.hash,
        //   authorName: commit.author_name,
        //   authorEmail: commit.author_email,
        //   commitMessage: commit.message,
        // }));

        // TODO RadStr: One branch only
        // const gitHistory: GitHistory = {
        //     branches: [{
        //         name: "main",
        //         commits,
        //     }]
        // };

        // TODO RadStr: Remove the explicit log branch stuff before this - I am not using it
        const customLogResult = await git.log({
            format: logFormat,
            "--all": null,
        });

        // TODO RadStr: Use abbreviated hashes instead?
        const logGraph = await git.raw(["log", "--graph", "--oneline", "--all", "--format=%H"]);
        console.info("logGraph", logGraph);
        console.info("customLogResult", customLogResult);

        // console.info("Branches:", await git.branch());
        // // response.json(gitHistory);

        const mapBranchToHeadCommitRaw = await git.raw([
            "for-each-ref",
            "--format=%(refname:short) %(objectname)",
            "refs/remotes/"
        ]);
        const mapBranchToHeadCommitAsArray: string[] = mapBranchToHeadCommitRaw.split("\n");
        const mapBranchToHeadCommit: Record<string, string> = {};
        mapBranchToHeadCommitAsArray.forEach(keyAndvalue => {
            const [branch, commitHash] = keyAndvalue.split(" ");
            mapBranchToHeadCommit[branch] = commitHash;
        });


        // const jsonResponse = {
        //     git2json: git2jsonRun,
        //     logGraph,
        // };

        console.info(customLogResult);
        const jsonResponse: FetchedGitData = {
            rawCommits: customLogResult.all,
            logGraph,
        };

        response.json(jsonResponse);
        // git2json
        //     .run({ paths })
        //     .then((myGitLogJSON: any) => {console.log(myGitLogJSON); response.json(myGitLogJSON); });
    }
    catch(err) {
        console.info("ERROR IN GIT LOG", err);
        throw new Error("Error while trying to fetch git history: " + err);
    }
    finally {
        fs.rmSync(directoryName, { recursive: true, force: true });
    }
});

// Just for debug
/**
 * Test methods
 * @example Example Usage: createTestGitHistory([3, 4, 6])
 * @param commitCounts
 * @returns
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
