// TODO RadStr: Taken from https://github.com/nicoespeon/gitgraph.js/tree/master/packages/gitgraph-react

// Use this as a reference https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-5-templates--without-commit-author

import { BetterModalProps, OpenBetterModal } from "@/lib/better-modal";
import { Gitgraph, templateExtend, TemplateName } from "@gitgraph/react";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "./modal";
import { Button } from "./ui/button";
import { useLayoutEffect, useState } from "react";
import { Package } from "@dataspecer/core-v2/project";
import { BranchUserApi } from "@gitgraph/core";
import { ReactSvgElement } from "@gitgraph/react/lib/types";

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

function getAllCommitsSortedByDate(fetchedGitBranches: GitHistory) {
  const commits: Commit[] = [];
  const processedCommits: Record<string, true> = {};

  for (const branch of fetchedGitBranches.branches) {
    for (const commit of branch.commits) {
      if (processedCommits[commit.hash]) {
        continue;
      }

      processedCommits[commit.hash] = true;
      commits.push(commit);
    }
  }

  const compareCommitsByDate = (a: Commit, b: Commit): number => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  }
  commits.sort(compareCommitsByDate);

  return commits;
}

export const GitHistoryVisualization = ({ isOpen, resolve, branches }: GitHistoryVisualizationProps) => {
  const [fetchedGitBranches, setFetchedGitBranches] = useState<GitHistory | null>(null);    // TODO RadStr: Probably no longer needed - just remove
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
            console.info("git data before", data, fetchedGitBranches);   // TODO RadStr: Debug
            setFetchedGitBranches(data);
            console.info("git data after", data, fetchedGitBranches);   // TODO RadStr: Debug

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


const createGitGraph = (withoutAuthor: any, fetchedGitBranches: GitHistory) => {
  // We don't even need the unique commits, only thing we could do with it is sort the branches by it, so the more active are on the left closer to the main
  const { commitToBranchesMap } = mapCommitsToBranches(fetchedGitBranches);
  const commitsFromOldestToNewest = getAllCommitsSortedByDate(fetchedGitBranches);

  for (const branch of fetchedGitBranches.branches) {
    branch.commits.reverse();     // Reverse it so it is from oldest to newest (oldest will be at [0]).
  }

  return <div>
    <Gitgraph options={{template: withoutAuthor}}>
      {(gitgraph) => {
        // Simulate git commands with Gitgraph API.
        gitgraph.clear();   // We have to call clear because of rerendering (we would have everything doubled)

        console.info("fetchedGitBranches", fetchedGitBranches);

        if (fetchedGitBranches !== null) {
          // TODO RadStr: Return at the end - when finished keep just the if

          // When it comes to merge commits. It is interesting, but in Git you can not 100% tell, which branch was merged into which.
          // Since the merge commit itself and its history can be part of many branches.
          // So we render merge commits only in cases when we can be 100% sure,
          // otherwise we just render linear history on main and if not on main then some other branch (non-deterministically).
          // Only time we can be 100% sure about branches, which were part of merge commit is when the merge commit exists on exactly ONE branch
          // (actually nevermind! By merging only the last commits of branches we can get around this condition and get better results (at least for normal usage of git))
          // and ONE of the parents also exists on EXACTLY ONE branch (except the one branch we merge into)
          // (EXACTLY ONE, because otherwise we can not tell the branch which was the one with the parent commit,
          // but in such case we could try to choose one, preferably the one, which has no following commit on the branch
          //  ... however we won't, we will just show the merge commits for those, whose last commit is the parent of the merge commit ... otherwise it will be just classic commit).
          // ....... We could use the merge commit messages, however those can be changed.
          // Also note that this algorithm is kinda slow, however there are usually not that many merge commits compared to total commit count, so we can afford that.
          const _mergeCommits: Record<string, Commit> = {};   // TODO RadStr: We need only the uniqueMergeCommits, however we keep these (you never know)
                                                              //          ... we could show merges even for non-unique, but for me it is kind of hard to wrap head around.
                                                              //          ... in a sense that we are then showing something which is true from data-standpoint however not how it actually happened
                                                              //          ... So we will just show the merge commits for 100% sure cases
          const uniqueMergeCommits: Record<string, Commit> = {};
          const mergesToRender: Record<string, {from: BranchHistory, to: BranchHistory}> = {};    // The merge commit hash to the branches which are part of the merge
          const commitsPinnedToBranch: Record<string, string> = {};    // The commit hash mapped to the branch it has to be on
          const branchesOrderedByDate: string[] = [fetchedGitBranches.defaultBranch];
          const processedBranches: Record<string, true> = { [fetchedGitBranches.defaultBranch]: true };
          for (const commit of commitsFromOldestToNewest) {
            const parents = commit.parents.split(" ");

            const branchesOnWhichCommitExists = commitToBranchesMap[commit.hash];
            for (const branch of branchesOnWhichCommitExists) {
              if (!processedBranches[branch]) {
                processedBranches[branch] = true;
                branchesOrderedByDate.push(branch);
              }
            }
            // TODO RadStr: Remove
            // if (parents.length === 1) {
            //   const branchesOnWhichCommitExists = commitToBranchesMap[commit.hash];
            //   let notYetVisitedBranch: string | null = null;
            //   let commitExistsOnAlreadyVisitedBranch: boolean = false;  // It exists on branch, which we already visited in one of previous commits
            //   for (const branch of branchesOnWhichCommitExists) {
            //     if (processedBranches[branch]) {
            //       commitExistsOnAlreadyVisitedBranch = true;
            //       break;
            //     }
            //     else {
            //       if (notYetVisitedBranch === null) {
            //         notYetVisitedBranch = branch;
            //       }
            //     }
            //   }
            //   if (commitExistsOnAlreadyVisitedBranch) {
            //     continue;
            //   }

            //   if (notYetVisitedBranch === null) {
            //     throw new Error("Commit does not exist on any branch");
            //   }

            //   processedBranches[notYetVisitedBranch] = true;
            //   branchesOrderedByDate.push(notYetVisitedBranch)
            //   continue;
            // }

            if (parents.length === 2) {
              _mergeCommits[commit.hash] = commit;
              uniqueMergeCommits[commit.hash] = commit;
              // Now find the parent, which is the last commit on some branch
              // We could also take the commit message and if it has the expected format then use it.
              // However I noticed that for example the pull request on github does not create sufficient message - it only gives out the source of the merge but not the target

              let fromCommit: string;
              let toCommit: string;
              let from: BranchHistory | undefined = undefined;
              let to: BranchHistory | undefined = undefined;
              // So go through all branches and look for the one which has it last

              for (const parent of parents) {
                const branchesForParent = commitToBranchesMap[parent];
                for (const branchForParent of branchesForParent) {
                   const branchHistory = fetchedGitBranches.branches.find(fetchedBranch => fetchedBranch.name === branchForParent);
                   if (branchHistory?.commits.at(-1)?.hash === parent) {
                    from = branchHistory;
                    fromCommit = parent;
                    toCommit = parent === parents[0] ? parents[1] : parents[0];
                  }
                }
              }
              const sharedBranches: string[] = [];
              for (const branch of commitToBranchesMap[parents[0]]) {
                if(branch === from?.name) {
                  continue;
                }
                if (commitToBranchesMap[parents[1]].includes(branch)) {
                  sharedBranches.push(branch);
                }
              }

              if (sharedBranches.length === 1) {
                to = fetchedGitBranches.branches.find(b => b.name === sharedBranches[0]);
              }
              else {
                // TODO RadStr: "findLast", that is Try newest instead
                // const branchName = branchesOrderedByDate.findLast(branchOrderedByDate => sharedBranches.includes(branchOrderedByDate));
                const branchName = branchesOrderedByDate.find(branchOrderedByDate => sharedBranches.includes(branchOrderedByDate));
                to = fetchedGitBranches.branches.find(b => b.name === branchName);
              }

              if (from === undefined || to === undefined) {
                console.info("'From' or 'to' for merge commit are not present, but it is probably not a error");
                continue;
              }

              mergesToRender[commit.hash] = {
                from,
                to,
              };
              commitsPinnedToBranch[fromCommit!] = from.name;
              commitsPinnedToBranch[toCommit!] = to.name;

              const lastFromBranchCommit = from.commits.at(-1);
              const lastFromBranchCommitIndex = commitsFromOldestToNewest.findIndex(c => c.hash === lastFromBranchCommit?.hash);
              for (let i = lastFromBranchCommitIndex - 1; i >= 0; i--) {
                const commonCommit = commitsFromOldestToNewest[i];
                const branchesForCommit = commitToBranchesMap[commonCommit.hash];
                let isInFromBranch = false;
                let isInToBranch = false;
                for (const branchForCommit of branchesForCommit) {
                  if (branchForCommit === to.name) {
                    isInToBranch = true;
                  }
                  else if (branchForCommit === from.name) {
                    isInFromBranch = true;
                  }
                }

                if (isInFromBranch && isInToBranch) {
                  // Common commit
                  break;
                }
                commitsPinnedToBranch[commonCommit.hash] = from.name;
              }
            }
          }

          // Ok the algorithm is as follows:
          // 1) Find all merge commits - going from oldest to newest!
          // 2) For each merge commit find the parent commit of the corresponding branches
          //  a) To do this you have to go from newest to oldest commit and find the first matching
          //  b) Mark these commits (only on the other branch - the one where the parent is the end of the branch)
          //   - This path between the commit and the first common commit has to be on another branch
          // 3) Mark these commits on which branch should they exist
          // 4) Go through all commits from oldest to newest.
          //  a) If it is in the marked part, then put it on corresponding branch
          //  b) If not put it on the oldest created branch, where it could be (commit can be part of more commits, that is why we put it on the oldest
          //      ... possibly we can try to put it on the newest - that is just one line change (TODO RadStr:))


          const gitGraphBranches: Record<string, BranchUserApi<ReactSvgElement>> = {};
          // TODO RadStr: Old variable - remove
          // const processedCommits: Record<string, string> = {};    // Maps the Commit hash to the branch name.

          let parentCommit: Commit | null = null;
          for (const commit of commitsFromOldestToNewest) {
            if (mergesToRender[commit.hash] !== undefined) {
              const mergeFrom = mergesToRender[commit.hash].from;
              if (gitGraphBranches[mergeFrom.name] !== undefined) {    // If the from branch is rendered, otherwise just draw it like normal commit ... there was some ambiguity when it comes to the branch merge targets
                // if (gitGraphBranches[mergesToRender[commit.hash].to.name] === undefined) {
                //   branchesOrderedByDate.push(mergesToRender[commit.hash].to.name);
                //   gitGraphBranches[mergesToRender[commit.hash].to.name] = gitgraph.branch(
                //     {
                //       name: mergesToRender[commit.hash].to.name,
                //       from: parentCommit?.hash      // If there is no parentCommit then the hash is undefined.
                //       // from: previousBranch === "" ? undefined : previousBranch
                //     }
                //   );
                // }

                const gitGraphBranchToMergeInto = gitGraphBranches[mergesToRender[commit.hash].to.name];
                gitGraphBranchToMergeInto.merge({
                  branch: mergeFrom.name,
                  commitOptions: {
                    author: `${commit.authorName} <${commit.authorEmail}>`,
                    subject: commit.commitMessage,
                    hash: commit.hash,
                    onClick: (gitGraphCommit) => {                        // TODO RadStr: Based on https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-3-events--on-commit-dot-click
                      alert(`You clicked the dot for: ${gitGraphCommit.subject}`);
                    },
                    onMessageClick: (gitGraphCommit) => {                 // TODO RadStr: Based on https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-3-events--on-commit-message-click
                      alert(`You clicked the commit text for: ${gitGraphCommit.subject}`);
                    },
                  },
                });
                continue;
              }
            }

            let branchToCommitOn: string;

            const pinnedToBranch = commitsPinnedToBranch[commit.hash];
            if (pinnedToBranch !== undefined) {
              branchToCommitOn = pinnedToBranch;
            }
            else {
              const branchesOnWhichCommitExists = commitToBranchesMap[commit.hash];
              // const newestBranch = branchesOrderedByDate.findLast(branchOrderedByDate => branchesOnWhichCommitExists.includes(branchOrderedByDate));
              // branchToCommitOn = newestBranch ?? branchesOnWhichCommitExists[0];

              // TODO RadStr: ... Trying the newest instead of oldest ... change comment of algorithm based on that
              const oldestBranch = branchesOrderedByDate.find(branchOrderedByDate => branchesOnWhichCommitExists.includes(branchOrderedByDate));
              branchToCommitOn = oldestBranch ?? branchesOnWhichCommitExists[0];
            }

            if (gitGraphBranches[branchToCommitOn] === undefined) {
              branchesOrderedByDate.push(branchToCommitOn);
              gitGraphBranches[branchToCommitOn] = gitgraph.branch(
                {
                  name: branchToCommitOn,
                  from: parentCommit?.hash      // If there is no parentCommit then the hash is undefined.
                  // from: previousBranch === "" ? undefined : previousBranch
                }
              );
            }


            gitGraphBranches[branchToCommitOn].commit({
                author: `${commit.authorName} <${commit.authorEmail}>`,
                subject: commit.commitMessage,
                hash: commit.hash,
                onClick: (gitGraphCommit) => {                        // TODO RadStr: Based on https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-3-events--on-commit-dot-click
                  alert(`You clicked the dot for: ${gitGraphCommit.subject}`);
                },
                onMessageClick: (gitGraphCommit) => {                 // TODO RadStr: Based on https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-3-events--on-commit-message-click
                  alert(`You clicked the commit text for: ${gitGraphCommit.subject}`);
                },
              });



            parentCommit = commit;
          }
        }
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
