import { z } from "zod";
import { asyncHandler } from "../utils/async-handler.ts";
import { resourceModel } from "../main.ts";
import express from "express";
import { simpleGit } from "simple-git";

import fs from "fs";
import { v4 as uuidv4 } from "uuid";

import git2json from "@fabien0102/git2json";


// TODO RadStr: Put these types into shared package between frontend and backend
type Commit = {
  authorName: string;
  authorEmail: string;
  commitMessage: string;
  hash: string;
  date: string;
  /**
   * The commit parents are separated by " "
   */
  parents: string;
}

type BranchHistory = {
  name: string;
  commits: Commit[];
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
    if (!resource) {
        response.status(404).send({ error: "Package does not exist." });
        return;
    }

    // const gitURL = resource.linkedGitRepositoryURL;
    // Test URLs
    // const gitURL = "https://github.com/octocat/hello-world";
    // const gitURL = "https://github.com/nodejs/node-addon-examples";
    const gitURL = "https://github.com/RadStr-bot/example-merge-repo";

    // TODO RadStr: Just debug name
    const directoryName = `./TODO_RADSTR_DEBUG_DIRECTORY_NAME/${query.iri}/${uuidv4()}`;        // Without the id, we will run into errors and race conditions
                                                                                                // TODO RadStr: This is/will be issue on more places
    fs.mkdirSync(directoryName, { recursive: true });
    const git = simpleGit(directoryName);

    try {
        // TODO: Compare SHAs (and maybe behave differently based on number of commits)
        console.info("Before cloning repo");
        // https://github.blog/open-source/git/get-up-to-speed-with-partial-clone-and-shallow-clone/ - The second one from quick summary - Treeless clone
        const gitCloneOptions = [ "--filter=tree:0" ];
        if (query.historyDepth !== undefined) {
            gitCloneOptions.push("--depth", query.historyDepth.toString());
        }
        await git.clone(gitURL, `.`, gitCloneOptions);
    }
    catch(err) {
        console.info("Error on clone", err);
        try {
            await git.init();
            await git.pull(gitURL);       // If it fails here, it failed completely
        }
        catch(err2) {
            console.info("I am removing directory", err2);
            fs.rmSync(directoryName, { recursive: true, force: true });
            throw err2;
        }
    }

    try {
        console.info("After cloning");
        // const log = await git.log();
        // console.info("log", {log});

        const defaultbranchGit = await git.branch(["-vv"]);
        const defaultBranchLabel = defaultbranchGit.branches[defaultbranchGit.current].label;
        const defaultBranch = defaultBranchLabel.substring(1, defaultBranchLabel.indexOf("]"));     // Inside the [] there is tracked branch - that is the remote to use
        console.info({defaultBranchLabel, defaultBranch});

        const gitHistory: GitHistory = {
            branches: [],
            defaultBranch,
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
                    commitMessage: commit.commitMessage,
                    date: commit.date,
                    parents: commit.parents,
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


        const logGraph = await git.raw(['log', '--graph', '--oneline', '--all']);
        console.info("logGraph", logGraph);

        // console.info("Branches:", await git.branch());
        // // response.json(gitHistory);

        // https://github.com/fabien0102/git2json#readme
        // TODO RadStr: Actually we don't need the git2json library, we already have the code, we just need to put the log data to different format then we do - we can even do that on front-end.
        const path = [directoryName];
        const git2jsonRun = await git2json.run({ path });
        console.log(git2jsonRun);

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

        // TODO RadStr: Debug
        const customLogResult = await git.log({
            format: logFormat,
        });
        const convertedCustomLogResult = customLogResult.all.map(logResult => {
            return {
                author: {
                    name: logResult.authorName,
                    email: logResult.authorEmail,
                    timestamp: logResult.authorTimestamp,
                },
                refs: convertRefsToGit2JsonFormat(logResult.refs),
                parents: convertParentsToGit2JsonFormat(logResult.parents),
                date: logResult.date,
                hash: logResult.hash,
                subject: logResult.commitMessage,
            };
        });

        console.info(customLogResult);
        const jsonResponse = {
            git2json: convertedCustomLogResult,
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


function createTestCommits(branchName: string, commitCount: number): Commit[] {
    const commits: Commit[] = [];
    for (let i = 0; i < commitCount; i++) {
        commits.push({
            authorName: `Author-${branchName}-${i}`,
            authorEmail: `Author-Email-${branchName}-${i}`,
            commitMessage: `Commit Message-${branchName}-${i}`,
            hash: `Hash-${branchName}-${i}`,
            date: i.toString(),
            parents: `Hash-${branchName}-${i-1}`
        });
    }

    return commits;
}


/**
 * Taken from https://github.com/fabien0102/git2json/blob/e067166d2468018b6f3982a8fb44a2e54110ce02/src/parsers.js#L15C3-L19C20
 */
function convertRefsToGit2JsonFormat(refs: string) {
    return refs.replace(/[\(\)]/g, '')
        .replace('->', ',')
        .split(', ')
        .map(a => a.trim())
        .filter(a => a);
}

/**
 * Taken from https://github.com/fabien0102/git2json/blob/e067166d2468018b6f3982a8fb44a2e54110ce02/src/parsers.js#L10C3-L10C44
 */
function convertParentsToGit2JsonFormat(parents: string) {
    return parents.split(' ').filter(b => b);
}