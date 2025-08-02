// TODO RadStr: Taken from https://github.com/nicoespeon/gitgraph.js/tree/master/packages/gitgraph-react

// Use this as a reference https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-5-templates--without-commit-author

import { BetterModalProps, OpenBetterModal } from "@/lib/better-modal";
import { Gitgraph, templateExtend, TemplateName } from "@gitgraph/react";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "./modal";
import { Button } from "./ui/button";
import { useLayoutEffect, useState } from "react";
import { Package } from "@dataspecer/core-v2/project";

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
          .then((data) => {
            console.info("git data", data);   // TODO RadStr: Debug

            const gitGraphElement = createGitGraph(withoutAuthor, data);
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


const createGitGraph = (withoutAuthor: any, importedGitGraph: any) => {
  return <div>
    <Gitgraph options={{template: withoutAuthor}}>
      {(gitgraph) => {

        // TODO RadStr: Not ideal, but it shows, that creating the branch history as it should be is highly non-trivial issue
        //              Also we should add the onClick properties to the objects stored in the "importedGitGraph".
        // TODO RadStr: Maybe try to fix my solution in future - it is better by focusing on the main and old/new branches, but it does not work correctly unfortunately
        gitgraph.import(importedGitGraph);
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
