// TODO RadStr: Taken from https://github.com/nicoespeon/gitgraph.js/tree/master/packages/gitgraph-react

// Use this as a reference https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-5-templates--without-commit-author

import { BetterModalProps, OpenBetterModal } from "@/lib/better-modal";
import { Gitgraph, templateExtend, TemplateName } from "@gitgraph/react";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "./modal";
import { Button } from "./ui/button";
import { useLayoutEffect, useState } from "react";
import { Package } from "@dataspecer/core-v2/project";

// TODO RadStr: Put these types into shared package between frontend and backend
type FetchedGitData = {
  rawCommits: RawCommit[],
  logGraph: string,     // TODO RadStr: Remove then if I won't use it
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

type Commit = {
  author: {
    name: string,
    email: string,
    timestamp: string,
  };
  subject: string;      // Commit message
  hash: string;         // Commit hash
  date: string;         // Author date of commit in iso8601
  parents: string[];
  refs: string[];       // The refs which points to this commit (HEADs of branches, i.e. the last commit on branch)
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

type GitHistoryVisualizationProps = {
  branches: Package[],
} & BetterModalProps<null>;


/**
 * @returns The hash of commit mapped to branches, which it is part of. And the commit hash mapped to the commit
 */
// TODO RadStr: Ignore for now, I might use it in future
// @ts-ignore
function mapCommitsToBranches(gitHistory: GitHistory): {
  commitToBranchesMap: Record<string, string[]>,
  hashToCommitMap: Record<string, Commit>,
 } {
  const commitToBranchesMap: Record<string, string[]> = {};
  const hashToCommitMap: Record<string, Commit> = {};
  for (const branch of gitHistory.branches) {
    for (const commit of branch.commits) {
      if (hashToCommitMap[commit.hash] === undefined) {
        hashToCommitMap[commit.hash] = commit;
      }

      if (commitToBranchesMap[commit.hash] === undefined) {
        commitToBranchesMap[commit.hash] = [];
      }

      commitToBranchesMap[commit.hash].push(branch.name);
    }
  }

  return {
    commitToBranchesMap,
    hashToCommitMap
  };
}

/**
 * @returns The unique commits mapped to relevant branches (keys = branches, values = unique commits).
 */
// TODO RadStr: Ignore for now, I might use it in future
// @ts-ignore
function getUniqueCommits(commitToBranchesMap: Record<string, string[]>, hashToCommitMap: Record<string, Commit>): {
  branchToUniqueCommitsMap: Record<string, Commit[]>,
  uniqueCommits: Record<string, Commit>,
} {
  const branchToUniqueCommitsMap: Record<string, Commit[]> = {};
  const uniqueCommits: Record<string, Commit> = {};

  for (const [commitHash, branches] of Object.entries(commitToBranchesMap)) {
    if (branches.length === 1) {
      uniqueCommits[commitHash] = hashToCommitMap[commitHash];

      const branchName = branches[0];
      if (branchToUniqueCommitsMap[branchName] === undefined) {
        branchToUniqueCommitsMap[branchName] = [];
      }

      const commit = hashToCommitMap[commitHash];
      if (commit === undefined) {
        console.error(`Commit for commit hash (${commitHash}) is missing`);
        continue;
      }
      branchToUniqueCommitsMap[branchName].push(commit);
    }
  }

  return {
    branchToUniqueCommitsMap,
    uniqueCommits
  };
}


export const GitHistoryVisualization = ({ isOpen, resolve, branches }: GitHistoryVisualizationProps) => {
  // TODO RadStr: Should be JSX.element not ANY
  // TODO RadStr: For some reason I have to put the gitgraph component into component stored in variable,
  // if I put it inside the JSX tree in this component, it does not update on react change

  const [gitGraphElement, setGitGraphElement] = useState<any | null>(null)

  useLayoutEffect(() => {
      if (isOpen) {
        window.requestAnimationFrame(() => document.getElementById("repository-url-dialog-div")?.focus());

        console.info("useLayoutEffect for git-history-vis");

        // TODO RadStr: Here we load the history for the relevant branches given in properties
        // TODO RadStr: Once again we already have the git link, we don't need to send the package iri, we can send the git url instead
        const urlQuery = `?iri=${branches[0].iri}`
        // Theoretically we can just fetch it directly from GitHub (or other provider) without calling the DS server, BUT:
        // Somebody has to implement it. We have to implement it for each provider.
        // GitHub has REST API request limits, so if we ask the server a bit too much, we have to call the DS backend anyways.
        // The commits are paginated (100 commits max per page) and we have to ask for each branch commit history separately - that is ton of requests.
        //  For unathenticated user (which is the case for browser), it is only 60/h, for authenticated it is 5k ... in case of GitHub (https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28)
        //  So for example GitHub repo with 10 branches and 120 commits on each is 21 requests (20 to fetch the commits, 1 to fetch the branches on project)
        fetch(import.meta.env.VITE_BACKEND + `/git/fetch-git-commit-history${urlQuery}`, {
          method: "GET",
        })
          .then((res) => res.json())
          .then((data: FetchedGitData) => {
            console.info("git data", data);   // TODO RadStr: Debug

            const convertedCommits = convertFetchedCommitsFormat(data.rawCommits);

            const gitGraphElement = createGitGraph(withoutAuthor, convertedCommits);
            setGitGraphElement(gitGraphElement);
          })
          .catch((error) => {
            console.error(`Error when fetching git history for ${branches[0].iri}. The error: ${error}`);
          });
      }
    }, []);

  const withoutAuthor = templateExtend(TemplateName.Metro, {
    commit: {
      message: {
        displayAuthor: true,
        displayHash: true,
      },
    },
  });

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      {/* <ModalContent className="sm:max-w-[1700px] max-w-[90%]"> */}
      <ModalContent className="max-w-[90%]">
        <ModalHeader>
          <ModalTitle>Project history in Git</ModalTitle>
          <ModalDescription>
            TODO RadStr: Modal description
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="overflow-y-auto max-h-[60vh]">    {/* TODO RadStr: Needed for the scrolling, the padding (p) so there isn't any part missing */}
          {gitGraphElement}
        </ModalBody>
        <ModalFooter className="flex flex-row">
          <Button variant="outline" onClick={() => resolve(null)}>Cancel</Button>
          <Button type="submit" onClick={() => resolve(null)}>Confirm</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}


const createGitGraph = (withoutAuthor: any, commits: Commit[]) => {

  return <div>
    <Gitgraph options={{template: withoutAuthor}}>
      {(gitgraph) => {
        // TODO RadStr: Not ideal, but it shows, that creating the branch history as it should be is highly non-trivial issue
        //              Also we should add the onClick properties to the objects stored in the "importedGitGraph".
        // TODO RadStr: Maybe try to fix my solution in future - it is better by focusing on the main and old/new branches, but it does not work correctly unfortunately
        let isFirst = true; // TODO RadStr: Debug variable
        for (const commit of Object.values(commits) as any) {
          // delete commit["refs"];
          // delete commit["hash"];
          delete commit["hashAbbrev"];
          delete commit["tree"];
          delete commit["treeAbbrev"];
          // delete commit["parents"];
          delete commit["parentsAbbrev"];
          // delete commit["author"];
          delete commit["committer"];
          // delete commit["subject"];
          delete commit["body"];
          delete commit["notes"];
          delete commit["stats"];
          if (isFirst) {
            console.info({commit});
          }
          isFirst = false;
          commit.onClick = (gitGraphCommit: any) => {                        // TODO RadStr: Based on https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-3-events--on-commit-dot-click
            alert(`You clicked the dot for: ${gitGraphCommit.subject}`);
          };
          commit.onMessageClick = (gitGraphCommit: any) => {                 // TODO RadStr: Based on https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-3-events--on-commit-message-click
            alert(`You clicked the commit text for: ${gitGraphCommit.subject}`);
          };
        }
        gitgraph.import(commits);
      }}
    </Gitgraph>
  </div>;
}


/**
 * Finds the branch which still have commits to be put into GitGraph. Returns null if there is no such branch
 * @deprecated Probably deprecated - I used it for the old version
 */
 // @ts-ignore
function findBranchToPutIntoGitGraph(currentBranchProcessingState: Record<string, number>, branches: BranchHistory[]): BranchHistory | null {
  let branchToPutIntoGitGraph: BranchHistory | null = null;
  for (const branch of branches) {
    if (currentBranchProcessingState[branch.name] < branch.commits.length) {
      branchToPutIntoGitGraph = branch;
      break;
    }
  }

  return branchToPutIntoGitGraph;
}


export const gitHistoryVisualizationOnClickHandler = async (openModal: OpenBetterModal, branches: Package[]) => {
  // TODO RadStr: These are DS branches - note that those are different from the git branches
  await openModal(GitHistoryVisualization, { branches });
}

function convertFetchedCommitsFormat(rawCommits: RawCommit[]) {
  const convertedCommits = rawCommits.map(convertRawCommitToCommit);
  return convertedCommits;
}

function convertRawCommitToCommit(rawCommit: RawCommit): Commit {
  return {
      author: convertAuthorDataToAuthorObject(rawCommit.authorName, rawCommit.authorEmail, rawCommit.authorTimestamp),
      refs: convertRefsToGit2JsonFormat(rawCommit.refs),
      parents: convertParentsToGit2JsonFormat(rawCommit.parents),
      date: rawCommit.date,
      hash: rawCommit.hash,
      subject: rawCommit.commitMessage,
  };
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

function convertAuthorDataToAuthorObject(authorName: string, authorEmail: string, authorTimestamp: string) {
  return {
    name: authorName,
    email: authorEmail,
    timestamp: authorTimestamp,
  };
}


// /**
//  * @returns The mapping of branch to the last commit on the branch
//  */
// function getRefs(commits: Commit[]): Record<string, string> {
//   const branchToLastCommitMap: Record<string, string> = {};

//   for (const commit of commits) {
//     commit.refs.forEach(ref => {
//       branchToLastCommitMap[commit.hash] = ref;
//     });
//   }

//   return branchToLastCommitMap;
// }

// type CommitToBranchInternalMapping = {
//   commitToIndentationMap: Record<string, number>;
//   branchToIndentationMap: Record<string, number>;
//   indentationToBranchMap: Record<number, string>;
// };

// function getIndentationsFromLogGraph(logGraph: string, refs: Record<string, string>): CommitToBranchInternalMapping {
//   const commitToIndentationMap: Record<string, number> = {};
//   const branchToIndentationMap: Record<string, number> = {};
//   const indentationToBranchMap: Record<number, string> = {};

//   // At First I thought that now I will just look at heads and move indentation if they are on the same line, but that does not work
//   // You actually have to follow the lines to correctly place data on branches + I was looking at one history and there the commits before merges were not
//   // HEADs of branches, so I am not sure what that meant - probably the branch can be safely shown in the merge it merged into, since it does not exist?
//   // .......... So we would actually have to parse the git graph, which I feel could get complicated real quick and there seems to be kind of ambiguity - see after Commit I - the |/
//   // *   20dd3dc (HEAD -> master) Merge branch 'branch2'
//   // |\
//   // | * 14f06e3 (branch2) Commit after merge
//   // * |   ad13a35 Merge branch 'branch1'
//   // |\ \
//   // | * | 1dc7201 (branch1) Commit after merge
//   // * | |   b8aa204 Merge branch2 into master
//   // |\ \ \
//   // | | |/
//   // | |/|
//   // | * | d5a02e6 Commit I
//   // | * | 3ed228a Commit H
//   // | * | fed55f0 Commit G
//   // * | |   7274272 Merge branch1 into master
//   // |\ \ \
//   // | | |/
//   // | |/|
//   // | * | dd765ff Commit F
//   // | |/
//   // | * c45ce5d Commit E
//   // | * b7e24a4 Commit D
//   // * | 624aa39 Commit C
//   // |/
//   // * 2325346 Commit B
//   // * e76c5a3 Commit A


//   const logGraphSplitIntoLines = logGraph.split("\n");
//   for (const line of logGraphSplitIntoLines) {
//     const commitMarkerPosition = line.indexOf("*");
//     if(commitMarkerPosition === -1) {
//       continue;
//     }

//     const hash = findFirstAlphanumericWord(line, commitMarkerPosition + 1);
//     if (hash === null) {
//       throw new Error(`Hash for given line (${line}) inside git log --graph is not present`);
//     }

//     commitToIndentationMap[hash] = commitMarkerPosition;
//   }

//   for (const [commit, branch] of Object.entries(refs)) {
//     const indentationForBranch = commitToIndentationMap[commit];
//     branchToIndentationMap[branch] = indentationForBranch;
//     indentationToBranchMap[indentationForBranch] = branch;
//   }

//   return {
//     commitToIndentationMap,
//     branchToIndentationMap,
//     indentationToBranchMap,
//   };
// }


// /**
//  * Generated by ChatGPT
//  *
//  * Finds the first alphanumeric word (a sequence of letters and/or digits)
//  * in the given string, starting from a specified index.
//  *
//  * @param str - The input string to search in.
//  * @param startIndex - The index to start the search from.
//  * @returns The first alphanumeric word found, or null if none exists.
//  *
//  * @example
//  * findFirstAlphanumericWord("   !@#abc123 xyz", 0); // returns "abc123"
//  * findFirstAlphanumericWord("...start 42next", 5);  // returns "42next"
//  * findFirstAlphanumericWord("$$$", 0);              // returns null
//  */
// function findFirstAlphanumericWord(str: string, startIndex: number): string | null {
//   // I don't know the internals of javascript, but hopefully it just creates reference to original array and not new copy.
//   const sliced = str.substring(startIndex);
//   const match = sliced.match(/[a-zA-Z0-9]+/);
//   return match ? match[0] : null;
// }

