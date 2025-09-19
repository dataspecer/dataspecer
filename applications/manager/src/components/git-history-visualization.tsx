// Inspired by https://github.com/nicoespeon/gitgraph.js/tree/master/packages/gitgraph-react

// Use this as a reference https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-5-templates--without-commit-author

import { BetterModalProps, OpenBetterModal, useBetterModal } from "@/lib/better-modal";
import { Gitgraph, templateExtend, TemplateName } from "@gitgraph/react";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "./modal";
import { Button } from "./ui/button";
import React, { useLayoutEffect, useState } from "react";
import { BaseResource, Package } from "@dataspecer/core-v2/project";
import { CommitActionsDialog } from "@/dialog/git-commit-actions-dialog";
import { Loader } from "lucide-react";
import { Template } from "@gitgraph/core/lib/template";
import { ResourceWithIris } from "@/package";
import { PACKAGE_ROOT, CommitInfo, RawCommit, BranchHistory, FetchedGitRawHistory } from "@dataspecer/git";

type DSPackageInProjectVisualizationData = {
  iri: string;
  lastCommitHash: string;
  representsBranch: boolean;
  branch: string;
}

type GitHistoryVisualizationProps = {
  examinedPackage: Package,
  allResources: Record<string, ResourceWithIris>
} & BetterModalProps<null>;


/**
 * @returns The hash of commit mapped to branches, which it is part of. And the commit hash mapped to the commit
 */
// TODO RadStr checked: Unused - Ignore for now, Might be useful in future for better implementation of import git log to gitGraph
// @ts-ignore
function mapCommitsToBranches(gitHistory: GitHistory): {
  commitToBranchesMap: Record<string, string[]>,
  hashToCommitMap: Record<string, CommitInfo>,
 } {
  const commitToBranchesMap: Record<string, string[]> = {};
  const hashToCommitMap: Record<string, CommitInfo> = {};
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
// TODO RadStr checked: Unused - Ignore for now, Might be useful in future for better implementation of import git log to gitGraph
// @ts-ignore
function getUniqueCommits(commitToBranchesMap: Record<string, string[]>, hashToCommitMap: Record<string, CommitInfo>): {
  branchToUniqueCommitsMap: Record<string, CommitInfo[]>,
  uniqueCommits: Record<string, CommitInfo>,
} {
  const branchToUniqueCommitsMap: Record<string, CommitInfo[]> = {};
  const uniqueCommits: Record<string, CommitInfo> = {};

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


function createGitToPackagesForProjectMapping(rootPackages: BaseResource[] | undefined) {
  // Create all the ds package for the current project, so we can visualize them on the client compared to the git ones
  // Allow only one branch? I mean to me it makes sense, why would you want to have the same branch multiple times in DS, just create new one going from the head, if you want it
  const dsPackagesInProjectForBranches: Record<string, DSPackageInProjectVisualizationData> = {};          // Maps the branch name to the package in the project
  const dsPackagesInProjectForNonBranches: Record<string, DSPackageInProjectVisualizationData[]> = {};     // Maps the last commit hash to all ds packages, which are non-branches and have that last commit hash
  const dsPackagesInProjectForAll: Record<string, DSPackageInProjectVisualizationData[]> = {};             // Maps the last commit hash to all ds packages, which have that last commit hash


  rootPackages?.forEach(resourceInPackage => {
      const dsPackageInProject: DSPackageInProjectVisualizationData = {
          iri: resourceInPackage.iri,
          lastCommitHash: resourceInPackage.lastCommitHash,
          representsBranch: resourceInPackage.representsBranchHead,
          branch: resourceInPackage.branch,
      };

      const typeSpecificKey = dsPackageInProject.representsBranch ? dsPackageInProject.branch : dsPackageInProject.lastCommitHash;
      if (dsPackageInProject.representsBranch) {
          dsPackagesInProjectForBranches[typeSpecificKey] = dsPackageInProject;
      }
      else {
          if (dsPackagesInProjectForNonBranches[typeSpecificKey] === undefined) {
              dsPackagesInProjectForNonBranches[typeSpecificKey] = [];
          }
          dsPackagesInProjectForNonBranches[typeSpecificKey].push(dsPackageInProject);
      }

      if (dsPackagesInProjectForAll[dsPackageInProject.lastCommitHash] === undefined) {
          dsPackagesInProjectForAll[dsPackageInProject.lastCommitHash] = [];
      }
      dsPackagesInProjectForAll[dsPackageInProject.lastCommitHash].push(dsPackageInProject);
  });

  return {
    dsPackagesInProjectForBranches,
    dsPackagesInProjectForNonBranches,
    dsPackagesInProjectForAll,
  };
}


export const GitHistoryVisualization = ({ isOpen, resolve, examinedPackage, allResources }: GitHistoryVisualizationProps) => {
  // For some reason I have to put the gitgraph component into component stored in variable,
  // if I put it inside the JSX tree in this component, it does not update on react change
  const [gitGraphElement, setGitGraphElement] = useState<React.ReactNode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const openModal = useBetterModal();

  useLayoutEffect(() => {
      if (isOpen) {
        console.info("useLayoutEffect for git-history-vis");
        setIsLoading(true);

        // Here we load the git history
        // Note that we could send the the git link directly and don't need to send the package iri and then find the link on backend
        // But we do it like this because there might be some possible attack by requesting some kind of weird url (can't think of any now though)
        const urlQuery = `?iri=${examinedPackage.iri}`;
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
          .then((data: FetchedGitRawHistory) => {
            const convertedCommits = convertFetchedCommitsFormat(data.rawCommits);

            const gitGraphTemplate = templateExtend(TemplateName.Metro, {
              commit: {
                message: {
                  displayAuthor: true,
                  displayHash: true,
                },
                dot: {
                  font: "oblique small-caps bold 12pt Trebuchet MS",      // Carefully chosen for the dot text to appear inside the circle
                }
              },
            });

            const root = allResources[PACKAGE_ROOT];
            const rootPackages = root.subResourcesIri
              .map(rootPackage => allResources[rootPackage])
              ?.filter(rootPackage => rootPackage !== undefined && rootPackage.projectIri === examinedPackage.projectIri);
            const { dsPackagesInProjectForAll, dsPackagesInProjectForBranches, dsPackagesInProjectForNonBranches } = createGitToPackagesForProjectMapping(rootPackages);

            const gitGraphElement = createGitGraph(
              openModal, examinedPackage, gitGraphTemplate, convertedCommits,
              dsPackagesInProjectForBranches, dsPackagesInProjectForNonBranches, dsPackagesInProjectForAll);
            setGitGraphElement(gitGraphElement);
            setIsLoading(false);
          })
          .catch((error) => {
            setIsLoading(false);
            alert("Fetch error, check console for more info");
            console.error(`Error when fetching git history for ${examinedPackage.iri}. The error: ${error}`);
          });
      }
    }, []);

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="max-w-[90%]">
        <ModalHeader>
          <ModalTitle>Project history in Git</ModalTitle>
          <ModalDescription>
            The "in DS" next to the branch means that the branch is tracked in DS.
            <br/>
            Similarly the text "DS" on the commit bubble marks the fact that the commit exists in DS.
            <br/>
            Note that you can click on text (or the bubble) to perform further actions.
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="overflow-y-auto max-h-[60vh]">    {/* Needed for the scrolling */}
          {isLoading ?
            <Loader className="mr-2 h-4 w-4 animate-spin" /> :
            gitGraphElement
            }
        </ModalBody>
        <ModalFooter className="flex flex-row">
          <Button variant="outline" onClick={() => resolve(null)}>Cancel</Button>
          <Button type="submit" onClick={() => resolve(null)}>Confirm</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}


const createGitGraph = (
  openModal: OpenBetterModal,
  examinedPackage: Package,
  gitGraphTemplate: Template,
  commits: CommitInfo[],
  dsPackagesInProjectForBranches: Record<string, DSPackageInProjectVisualizationData>,
  dsPackagesInProjectForNonBranches: Record<string, DSPackageInProjectVisualizationData[]>,
  dsPackagesInProjectForAll: Record<string, DSPackageInProjectVisualizationData[]>,
) => {
  return <div>
    <Gitgraph options={{template: gitGraphTemplate}}>
      {(gitgraph) => {
        // Settled for the imort method in the visualization library, but note that it is not optimal - there are situations when it does not exactly reflect the commit history
        // (Note that it is impossible to visualize commit history always correctly - there are ambiguous histories)
        // I tried implementing custom solution here - https://github.com/dataspecer/dataspecer/commit/9713144648eee3a11b1e37a700840af2cc314744
        // The idea was quite simple - we provide git history but each commits remember on which branches it is.
        // Then we build the git history from the start starting on main branch:
        // If the commit is on branch which was yet put into renderer put it onto the oldest (or newest?) one
        // If not create new branch. Either chosen randomly or with some heuristic
        // Alternative solutions was to parse the git log --graph command
        // We should also somehow reflect that some branches are in DS and some not, etc. it is really non-trivial problem
        for (const commit of Object.values(commits) as any) {
          // These are the needed properties on the commit object for import to work
          // delete commit["refs"];
          // delete commit["hash"];
          // delete commit["parents"];
          // delete commit["author"];
          // delete commit["subject"];
          commit.onClick = (gitGraphCommit: any) => {                        // Based on https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-3-events--on-commit-dot-click
            commitOnClickHandler(openModal, examinedPackage, gitGraphCommit, dsPackagesInProjectForBranches, dsPackagesInProjectForNonBranches[gitGraphCommit.hash]);
          };
          commit.onMessageClick = (gitGraphCommit: any) => {                 // Based on https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-3-events--on-commit-message-click
            commitOnClickHandler(openModal, examinedPackage, gitGraphCommit, dsPackagesInProjectForBranches, dsPackagesInProjectForNonBranches[gitGraphCommit.hash]);
          };
          if (dsPackagesInProjectForAll[commit.hash] !== undefined) {
            commit.dotText = "DS";      // Kind of weird, but this is not documented anywhere I noticed it when I was looking at the implementation in
                                        // https://github.com/nicoespeon/gitgraph.js/blob/ed72d11d1e50ccd208326d9ded551f719cfa2b3a/packages/gitgraph-react/src/Dot.tsx#L42
          }
        }


        // Access private property to get information about branches and commits
        const userApi = gitgraph.import(commits);

        const coreGraph = (userApi as any)._graph;
        for (const branch of Object.keys(dsPackagesInProjectForBranches)) {
          let branchRender = coreGraph.branches.get(branch);
          if (branchRender !== undefined) {
            branchRender.renderLabel = renderLabel;
          }

          branchRender = coreGraph.branches.get("origin/" + branch);
          if (branchRender !== undefined) {
            branchRender.renderLabel = renderLabel;
          }
        }
      }}
    </Gitgraph>
  </div>;
}

function renderLabel(branch: any) {
  // Based on playing with ChatGPT
  return <svg>
    <rect
      x={0.5}
      y={0.5}
      width={branch.name.length * 10 + 54} // rough estimate, the +54 is for the (in DS)
      height={30} // adjust based on font size
      fill="none"
      stroke={branch.computedColor}
      strokeWidth={1}
      rx={10}
      ry={10}
    />
    <text
      x={10}
      y={16}
      alignmentBaseline="middle"
      dominantBaseline="middle"
      fill={branch.computedColor}
      style={{ font: branch.style.label.font }}
    >
      {branch.name}
      <tspan fontSize="0.6em"> (in DS)</tspan>
    </text>
  </svg>;
}

const commitOnClickHandler = (
  openModal: OpenBetterModal,
  examinedPackage: Package,
  gitGraphCommit: any,
  dsPackagesInProjectForBranches: Record<string, DSPackageInProjectVisualizationData>,
  packagesRelatedToCommit?: DSPackageInProjectVisualizationData[],
) => {
  console.info({gitGraphCommit});
  let renderBranchName: string | null;
  if (gitGraphCommit.branches[0] === "") {
    renderBranchName = null;
  }
  else {
    renderBranchName = gitGraphCommit.branches[0];
    const originPrefix = "origin/";
    if(renderBranchName?.startsWith(originPrefix)) {
      renderBranchName = renderBranchName.substring(originPrefix.length);
    }
  }
  const branchAlreadyExistsInDS = renderBranchName !== null && dsPackagesInProjectForBranches[renderBranchName] !== undefined;
  const commitAlreadyExistsInDS = packagesRelatedToCommit !== undefined && packagesRelatedToCommit.length > 0;

  openModal(CommitActionsDialog, { examinedPackage, branch: renderBranchName, commitHash: gitGraphCommit.hash, branchAlreadyExistsInDS, commitAlreadyExistsInDS });
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


export const gitHistoryVisualizationOnClickHandler = async (
  openModal: OpenBetterModal,
  examinedPackage: Package,
  allResources: Record<string, ResourceWithIris>
) => {
  await openModal(GitHistoryVisualization, { examinedPackage, allResources });
}

function convertFetchedCommitsFormat(rawCommits: RawCommit[]) {
  const convertedCommits = rawCommits.map(convertRawCommitToCommit);
  return convertedCommits;
}

function convertRawCommitToCommit(rawCommit: RawCommit): CommitInfo {
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
// function getRefs(commits: CommitInfo[]): Record<string, string> {
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

