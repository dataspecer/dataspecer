// TODO RadStr: Taken from https://github.com/nicoespeon/gitgraph.js/tree/master/packages/gitgraph-react

// Use this as a reference https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-5-templates--without-commit-author

import { BetterModalProps, OpenBetterModal, useBetterModal } from "@/lib/better-modal";
import { Gitgraph, templateExtend, TemplateName } from "@gitgraph/react";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "./modal";
import { Button } from "./ui/button";
import { useLayoutEffect, useState } from "react";
import { Package } from "@dataspecer/core-v2/project";
import { CommitActionsDialog } from "@/dialog/git-commit-actions-dialog";
import { Loader } from "lucide-react";
import { Template } from "@gitgraph/core/lib/template";

// TODO RadStr: Put these types into shared package between frontend and backend
type DSPackageInProjectVisualizationData = {
  iri: string;
  lastCommitHash: string;
  representsBranch: boolean;
  branch: string;
}

type FetchedGitData = {
  rawCommits: RawCommit[],      // TODO RadStr: Note that on server here needs to be readonly
  logGraph: string,             // TODO RadStr: Remove then if I won't use it
  // TODO RadStr: ... Allow only one branch? I mean to me it makes sense, why would you want to have the same branch multiple times in DS, just create new one going from the head, if you want it
  dsPackagesInProjectForBranches: Record<string, DSPackageInProjectVisualizationData>,          // Maps the branch name to the package in the project
  dsPackagesInProjectForNonBranches: Record<string, DSPackageInProjectVisualizationData[]>,     // Maps the last commit hash to all ds packages, which are non-branches and have that last commit hash
  dsPackagesInProjectForAll: Record<string, DSPackageInProjectVisualizationData[]>,             // Maps the last commit hash to all ds packages, which have that last commit hash
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
  examinedPackage: Package,
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


export const GitHistoryVisualization = ({ isOpen, resolve, examinedPackage }: GitHistoryVisualizationProps) => {
  // TODO RadStr: Should be JSX.element not ANY
  // TODO RadStr: For some reason I have to put the gitgraph component into component stored in variable,
  // if I put it inside the JSX tree in this component, it does not update on react change

  const [gitGraphElement, setGitGraphElement] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const openModal = useBetterModal();

  useLayoutEffect(() => {
      if (isOpen) {
        console.info("useLayoutEffect for git-history-vis");
        setIsLoading(true);

        // TODO RadStr: Here we load the history for the relevant branches given in properties
        // TODO RadStr: Once again we already have the git link, we don't need to send the package iri, we can send the git url instead
        const urlQuery = `?iri=${examinedPackage.iri}&projectIri=${examinedPackage.projectIri}`;
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

            const gitGraphElement = createGitGraph(
              openModal, examinedPackage, gitGraphTemplate, convertedCommits,
              data.dsPackagesInProjectForBranches, data.dsPackagesInProjectForNonBranches, data.dsPackagesInProjectForAll);
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
      {/* <ModalContent className="sm:max-w-[1700px] max-w-[90%]"> */}
      <ModalContent className="max-w-[90%]">
        <ModalHeader>
          <ModalTitle>Project history in Git</ModalTitle>
          <ModalDescription>
            TODO RadStr: Modal description
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="overflow-y-auto max-h-[60vh]">    {/* TODO RadStr: Needed for the scrolling, the padding (p) so there isn't any part missing */}
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
  commits: Commit[],
  dsPackagesInProjectForBranches: Record<string, DSPackageInProjectVisualizationData>,
  dsPackagesInProjectForNonBranches: Record<string, DSPackageInProjectVisualizationData[]>,
  dsPackagesInProjectForAll: Record<string, DSPackageInProjectVisualizationData[]>,
) => {
  return <div>
    <Gitgraph options={{template: gitGraphTemplate}}>
      {(gitgraph) => {
        // TODO RadStr: Not ideal, but it shows, that creating the branch history as it should be is highly non-trivial issue
        //              Also we should add the onClick properties to the objects stored in the "importedGitGraph".
        // TODO RadStr: Maybe try to fix my solution in future - it is better by focusing on the main and old/new branches, but it does not work correctly unfortunately
        let isFirst = true; // TODO RadStr: Debug variable
        for (const commit of Object.values(commits) as any) {
          // TODO RadStr: remove this - just put from backend only the stuff that is needed instead of deleting

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
            commitOnClickHandler(openModal, examinedPackage, gitGraphCommit, dsPackagesInProjectForBranches, dsPackagesInProjectForNonBranches[gitGraphCommit.hash]);
          };
          commit.onMessageClick = (gitGraphCommit: any) => {                 // TODO RadStr: Based on https://www.nicoespeon.com/gitgraph.js/stories/?path=/story/gitgraph-react-3-events--on-commit-message-click
            commitOnClickHandler(openModal, examinedPackage, gitGraphCommit, dsPackagesInProjectForBranches, dsPackagesInProjectForNonBranches[gitGraphCommit.hash]);
          };
          if (dsPackagesInProjectForAll[commit.hash] !== undefined) {
            commit.dotText = "DS";      // Kind of weird, but this is not documented anywhere I noticed it when I was looking at the implementation in
                                        // https://github.com/nicoespeon/gitgraph.js/blob/ed72d11d1e50ccd208326d9ded551f719cfa2b3a/packages/gitgraph-react/src/Dot.tsx#L42
          }


          // commit.renderDot = function(gitGraphCommit: any) {
          //   return React.createElement(
          //     'svg',
          //     { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 71.84 75.33', height: '30', width: '30', onClick: () => alert('Clicked!'), },
          //     React.createElement(
          //       'g',
          //       { fill: gitGraphCommit.style.dot.color, stroke: 'white', strokeWidth: '2' },
          //       React.createElement('path', {
          //         d:
          //           'M68.91,35.38c4.08-1.15,3.81-3-.22-3.75-3.1-.7-18.24-5.75-20.71-6.74-2.15-1-4.67-.12-1,3.4,4,3.53,1.36,8.13,2.79,13.47C50.6,44.89,52.06,49,56,55.62c2.09,3.48,1.39,6.58-1.42,6.82-1.25.28-3.39-1.33-3.33-3.82h0L44.68,43.79c1.79-1.1,2.68-3,2-4.65s-2.5-2.29-4.46-1.93l-1.92-4.36a3.79,3.79,0,0,0,1.59-4.34c-.62-1.53-2.44-2.27-4.37-2L36,22.91c1.65-1.12,2.46-3,1.83-4.52a3.85,3.85,0,0,0-4.37-1.95c-.76-1.68-2.95-6.89-4.89-10.73C26.45,1.3,20.61-2,16.47,1.36c-5.09,4.24-1.46,9-6.86,12.92l2.05,5.35a18.58,18.58,0,0,0,2.54-2.12c1.93-2.14,3.28-6.46,3.28-6.46s1-4,2.2-.57c1.48,3.15,16.59,47.14,16.59,47.14a1,1,0,0,0,0,.11c.37,1.48,5.13,19,19.78,17.52,4.38-.52,6-1.1,9.14-3.83,3.49-2.71,5.75-6.08,5.91-12.62.12-4.67-6.22-12.62-5.81-17S66.71,36,68.91,35.38Z',
          //       }),
          //       React.createElement('path', {
          //         d:
          //           'M2.25,14.53A28.46,28.46,0,0,1,0,17.28s3,4.75,9.58,3a47.72,47.72,0,0,0-1.43-5A10.94,10.94,0,0,1,2.25,14.53Z',
          //       })
          //     ),
          //   );
          // };

          // commit.renderDot = (gitGraphCommit: any) => {
          //   // We want to imitate this:
          //   // https://github.com/nicoespeon/gitgraph.js/blob/ed72d11d1e50ccd208326d9ded551f719cfa2b3a/packages/gitgraph-react/src/Dot.tsx#L42

          //   // TODO RadStr: Debug print
          //   console.info("gitGraphCommit", gitGraphCommit);

          //   return (
          //     <g>
          //       <circle
          //         id={gitGraphCommit.hash}
          //         cx={gitGraphCommit.style.dot.size}
          //         cy={gitGraphCommit.style.dot.size}
          //         r={gitGraphCommit.style.dot.size}
          //         fill={gitGraphCommit.style.dot.color as string}
          //         // // cx={x}
          //         // // cy={y}
          //         // cx={7}
          //         // cy={2}      // Just enough offset to be perfectly in middle
          //         // r={radius}
          //         // fill={gitGraphCommit.style.dot.color || "black"}
          //       />
          //       {/* Put custom text inside */}
          //       <text
          //         // x={x}
          //         // y={y + 4} // adjust vertical alignment
          //         textAnchor="middle"
          //         fontSize="10"
          //         fill="white"
          //       >
          //         DS
          //       </text>
          //     </g>
          //   );
          // };
        }


        // Access private property to get information about branches and commits
        const userApi = gitgraph.import(commits);

        // @ts-ignore
        const coreGraph = (userApi as any)._graph;
        console.info("coreGraph", coreGraph);
        for (const branch of Object.keys(dsPackagesInProjectForBranches)) {
          console.info("TEST0", branch);
          console.info("TEST1", coreGraph.branches);
          console.info("TEST2", coreGraph.branches.get(branch));
          console.info("TEST3", coreGraph.branches[branch]);
          let branchRender = coreGraph.branches.get(branch);
          if (branchRender !== undefined) {
            const oldName = branchRender.name;
            branchRender.name += "ds";
            branchRender.style = {
              ...branchRender.style,
              label: {
                ...branchRender.style.label,
                bgColor: '#ffce52',
                color: 'black',
                strokeColor: '#ce9b00',
                borderRadius: 0,
                font: 'italic 12pt serif',
              },
            };

            coreGraph.branches.set(branchRender.name, branchRender);
            coreGraph.branches.delete(oldName);

          }

          branchRender = coreGraph.branches.get("origin/" + branch);
          if (branchRender !== undefined) {
            branchRender.renderLabel = function(branch: any) {
              // Based on playing with ChatGPT
              return <svg>
                <rect
                  x={0}
                  y={0.5}
                  width={branch.name.length * 10 + 40} // rough estimate
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


            //   return <div>
            //     <text style={{
            //       alignmentBaseline: 'middle',
            //       dominantBaseline: 'middle',
            //       fill: branch.style.label.color,
            //       font: branch.style.label.font,
            //       // y: 20,
            //       transform: 'rotate(15)',
            //     }}>xddd</text>
            //   </div>
            //   return React.createElement(
            //     'text',
            //     {
            //       alignmentBaseline: 'middle',
            //       dominantBaseline: 'middle',
            //       fill: branch.style.label.color,
            //       style: { font: branch.style.label.font },
            //       y: 20,
            //       transform: 'rotate(15)',
            //     },
            //     '\uD83C\uDFB7 ',
            //     branch.name + "(... Present in DS)"
            //   );
            };

          //   const oldName = branchRender.name;
          //   branchRender.name += "dsss";
          //   branchRender.style = {
          //     ...branchRender.style,
          //     label: {
          //       ...branchRender.style.label,
          //       bgColor: '#ffce52',
          //       color: 'black',
          //       strokeColor: '#ce9b00',
          //       borderRadius: 0,
          //       font: 'italic 12pt serif',
          //     },
          //   };

          //   const previousGetCommitImplementation = coreGraph.refs.getCommit;
          //   coreGraph.refs.getCommit = (name: string) => {
          //     if (name === branchRender.name) {
          //       return previousGetCommitImplementation(oldName);
          //     }
          //     else {
          //       previousGetCommitImplementation(name);
          //     }
          //   };
          //   // coreGraph.branches.set(branchRender.name, branchRender);
          //   // coreGraph.branches.delete(oldName);
          //   coreGraph.refs.commitPerName.set(branchRender.name, coreGraph.refs.commitPerName.get(oldName));
          //   // coreGraph.refs.commitPerName.delete(oldName);
          //   console.info("coregraph again:", {coreGraph});
          }
        }
      }}
    </Gitgraph>
  </div>;
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


export const gitHistoryVisualizationOnClickHandler = async (openModal: OpenBetterModal, examinedPackage: Package) => {
  // TODO RadStr: These are DS branches - note that those are different from the git branches
  await openModal(GitHistoryVisualization, { examinedPackage });
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

