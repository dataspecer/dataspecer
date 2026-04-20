import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { useAsyncMemo } from "@/hooks/use-async-memo";
import { BetterModalProps, useBetterModal } from "@/lib/better-modal";
import { requestLoadPackage, ResourceWithIris } from "@/package";
import { MergeState, PACKAGE_ROOT, PullRequestFetchResponse, PullRequestInfo } from "@dataspecer/git";
import { Loader } from "lucide-react";
import { useMemo, useState } from "react";
import { createMergeStateOnBackend, fetchMergeState } from "./open-merge-state";
import { importFromGit } from "@/utils/git-backend-requests";
import { GitProviderFactory } from "@dataspecer/git/git-providers";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { toast } from "sonner";
import { createCloseLoadingDialogObject, LoadingDialog } from "./loading-dialog";
import { usePaginationComponent } from "@/components/pagination-component";
import { Button } from "@/components/ui/button";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";
import { CREATE_MERGE_STATE_WAIT_TIME, GIT_IMPORT_WAIT_TIME } from "@/utils/git-wait-times";
import { createNewTabAndOpen } from "./sign-in";


type GitPrsListDialogProps = {
  branch: string | null;
  gitUrl: string;
  resources: Record<string, ResourceWithIris>;
  gitProviderSpecificNameForPR: string;
  gitProviderSpecificNameForPRShortcut: string;
} & BetterModalProps<null>;


/**
 * If the provided branch is null then it lists all PRs for resource.
 */
export const GitPrsListDialog = ({ resources, branch, gitUrl, gitProviderSpecificNameForPR, gitProviderSpecificNameForPRShortcut, isOpen, resolve }: GitPrsListDialogProps) => {
  // Uses the PaginationComponent from the hook to render the pagination.
  const { pageOnFrontend, itemCountPerPage, setTotalItemCount, setIsLastPageBasedOnServerResponse, PaginationComponent } = usePaginationComponent();

  const gitProvider = useMemo(() => {
    return GitProviderFactory.createGitProviderFromRepositoryURL(gitUrl, fetch, null);
  }, []);

  const [openedPrs, cannotUseOpenedPrs] = useAsyncMemo(async () => {
    const queryParams: Record<string, string | number> = {
      gitUrl: encodeURIComponent(gitUrl),
      page: pageOnFrontend,
      perPage: itemCountPerPage
    };
    if (branch !== null) {
      queryParams["branch"] = branch;
    }

    let pullRequestsFetchUrl: string;
    if (branch === null) {
      pullRequestsFetchUrl = import.meta.env.VITE_BACKEND + "/git/opened-pull-requests";
    }
    else {
      pullRequestsFetchUrl = import.meta.env.VITE_BACKEND + "/git/opened-pull-requests-for-branch";
    }
    let isFirst: boolean = true;
    for (const [key, value] of Object.entries(queryParams)) {
      if (isFirst) {
        pullRequestsFetchUrl += "?";
        isFirst = false;
      }
      else {
        pullRequestsFetchUrl += "&";
      }
      pullRequestsFetchUrl += key + "=" + value;
    }

    const pullRequestsFetchResponse = await fetch(
      pullRequestsFetchUrl,
      {
        credentials: "include",         // Important, without this we don't send the authorization cookies
        method: "GET",
      });
    const pullRequestResponseData: PullRequestFetchResponse = await pullRequestsFetchResponse.json();
    setTotalItemCount(pullRequestResponseData.totalPrCount);
    setIsLastPageBasedOnServerResponse(pullRequestResponseData.isLastPage);
    return pullRequestResponseData.pullRequests;
  }, [pageOnFrontend, itemCountPerPage]);


  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className={"min-w-[80%] overflow-x-auto overflow-y-auto max-h-[90%]"}>
        <ModalHeader>
          <ModalTitle>
            {
              branch === null ?
                `List of all opened ${gitProviderSpecificNameForPR}s (${gitProviderSpecificNameForPRShortcut}) for given Git repository` :
                `List of opened ${gitProviderSpecificNameForPR}s (${gitProviderSpecificNameForPRShortcut}) for given package and branch`
            }
          </ModalTitle>
          <ModalDescription>
            {
              branch === null ? null : <>
                The PRs where one of the merge actors is the examined branch.
                <br/>
              </>

            }
            ⚠️ Note that you have to close {gitProviderSpecificNameForPRShortcut} in Dataspecer with merge commit.
            Merging (or rebasing) {gitProviderSpecificNameForPRShortcut} in Git breaks IRIs.
            <br/>
            <p className="flex flex-1 flex-row">You can either close the {gitProviderSpecificNameForPRShortcut} with merge, or merge the changes from the 'merge to' branch to the 'merge from' branch (reverse merge).
              <PRMergeTooltip gitProviderSpecificNameForPRShortcut={gitProviderSpecificNameForPRShortcut} isSpecificBranchPRsList={branch !== null} />
            </p>
          </ModalDescription>
          {
            cannotUseOpenedPrs ? <Loader className="mr-2 mt-1 h-4 w-4 animate-spin" /> :
            <div className=" w-full max-h-[95%]">
              <div className="grid grid-cols-[4fr_2fr_2fr_3fr_3fr_2fr_1.5fr_1.5fr] divide-x divide-y border-gray-300 divide-gray-300 ml-4 pt-6 w-full">
                <div className="flex items-center justify-center border-gray-300">Title</div>
                <div className="flex items-center justify-center">Created at</div>
                <div className="flex items-center justify-center">Modified at</div>
                <div className="flex items-center justify-center">Merge from</div>
                <div className="flex items-center justify-center">Merge to</div>
                <div className="flex items-center justify-center border-gray-300 border-b border-r">Add/Del</div>
                <div className="flex items-center justify-center border-gray-300">Reverse merge</div>
                <div className="flex items-center justify-center border-gray-300">Merge {gitProviderSpecificNameForPRShortcut}</div>
              </div>
              <div className="w-full">
                {openedPrs?.map(pr => <PullRequestComponent pullRequestInfo={pr} resources={resources} resourceGitUrl={gitUrl} resolve={resolve}/>) ?? null}
              </div>
            </div>
          }
          {
            cannotUseOpenedPrs ? null : <PaginationComponent items={openedPrs!} itemsOnPageScalingFactor={1} isPageNumberingExact={branch === null}
                                                             itemCountOnPageText={`${gitProviderSpecificNameForPRShortcut} count on page`} totalItemCountText={`Total ${gitProviderSpecificNameForPRShortcut} count`}/>
          }
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => resolve(null)}>Close</Button>
          <Button variant="default" onClick={() => createNewTabAndOpen(gitProvider.getUrlToPRs(gitUrl))}>Visit page with PRs</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

type PRMergeTooltipProps = {
  gitProviderSpecificNameForPRShortcut: string;
  isSpecificBranchPRsList: boolean;
};

function PRMergeTooltip({ gitProviderSpecificNameForPRShortcut, isSpecificBranchPRsList }: PRMergeTooltipProps) {
  return <div>
    <PopOverGitGeneralComponent>
      <div>The reverse merge represents the classic workflow, where you first merge the 'merge to' branch</div>
      <div>&nbsp;into your branch to make sure that everything works and finish the {gitProviderSpecificNameForPRShortcut} after that.</div>
      <div>The 'Merge {gitProviderSpecificNameForPRShortcut}' simply merges the 'merge from' branch into the 'merge to' branch.</div>
      <div>The buttons do the following:</div>
      <div><p className="text-blue-600 inline">Open Merge state</p> - opens the already existing merge state</div>
      <div><p className="text-green-600 inline">Merge</p> - Creates new merge state, since it does not exist.</div>
      <div><p className="text-purple-600 inline">Import + Merge</p> - Imports the missing package and creates merge state between them</div>
      {isSpecificBranchPRsList ? null : <div><p className="text-orange-600 inline">Import both + Merge</p> - Imports both packages and creates merge state between them.</div>}
    </PopOverGitGeneralComponent>
  </div>;
}


type PullRequestComponentProps = {
  pullRequestInfo: PullRequestInfo;
  resources: Record<string, ResourceWithIris>;
  resourceGitUrl: string;
  resolve: (value: null) => void;
}

function PullRequestComponent({ pullRequestInfo, resources, resourceGitUrl, resolve }: PullRequestComponentProps) {
  const openModal = useBetterModal();
  const [fetchedMergeState, setFetchedMergeState] = useState<MergeState | null>(null);
  const [fetchedReverseMergeState, setFetchedReverseMergeState] = useState<MergeState | null>(null);
  const [hoveredOnActionButton, setHoveredOnActionButton] = useState<boolean>(false);
  const [hoveredOnNotActionButton, setHoveredOnNotActionButton] = useState<boolean>(false);


  const mergeFromInDataspecer: ResourceWithIris | null = Object.values(resources)
    .find(resource => resource !== null && resource.linkedGitRepositoryURL === resourceGitUrl &&
                      resource.branch === pullRequestInfo.mergeFromBranch && resource.representsBranchHead) ?? null;
  const isMergeFromInDS = mergeFromInDataspecer !== null;

  const mergeToInDataspecer: ResourceWithIris | null = Object.values(resources)
    .find(resource => resource !== null && resource.linkedGitRepositoryURL === resourceGitUrl &&
                      resource.branch === pullRequestInfo.mergeToBranch && resource.representsBranchHead) ?? null;
  const isMergeToInDS = mergeToInDataspecer !== null;

  // They way you should read the code is in this functions is to look at the "closePR", that is the non reversed values.
  const createActionButtonRenderData = (isReverseMerge: boolean) => async () => {
    const isMergeFromForActionButtonInDS = isReverseMerge ? isMergeToInDS : isMergeFromInDS;
    const isMergeToForActionButtonInDS = isReverseMerge ? isMergeFromInDS : isMergeToInDS;

    if (isMergeFromInDS && isMergeToInDS) {
      const mergeFromForActionButtonIri = isReverseMerge ? mergeToInDataspecer.iri : mergeFromInDataspecer.iri;
      const mergeToForActionButtonIri = isReverseMerge ? mergeFromInDataspecer.iri : mergeToInDataspecer.iri;
      const mergeStateFromBackend = await fetchMergeState(mergeFromForActionButtonIri, mergeToForActionButtonIri, false, false, false);
      if (isReverseMerge) {
        setFetchedReverseMergeState(mergeStateFromBackend)
      }
      else {
        setFetchedMergeState(mergeStateFromBackend);
      }

      if (mergeStateFromBackend !== null) {
        return {
          actionButtonText: "Open merge state",
          actionButtonClassname: "border-1 bg-blue-100 border-blue-600 hover:bg-blue-600 hover:text-white text-sm font-semibold transition cursor-pointer dark:bg-blue-900 dark:border-blue-400 dark:hover:bg-blue-500 dark:hover:text-white",
          actionButtonTooltip: "The merge state already exists in Dataspecer. The button opens it.",
        };
      }
      else {
        return {
          actionButtonText: "Merge",
          actionButtonClassname: "border-1 bg-green-100 border-green-600 hover:bg-green-600 hover:text-white text-sm font-semibold transition cursor-pointer dark:bg-green-900 dark:border-green-400 dark:hover:bg-green-500 dark:hover:text-white",
          actionButtonTooltip: "Both branches are already tracked inside Dataspecer. This button will create new merge state between them",
        };
      }
    }
    else if (isMergeToForActionButtonInDS) {
      return {
        actionButtonText: "Import + Merge",
        actionButtonClassname: "border-1 bg-purple-100 border-purple-600 hover:bg-purple-600 hover:text-white text-sm font-semibold transition cursor-pointer dark:bg-purple-900 dark:border-purple-400 dark:hover:bg-purple-500 dark:hover:text-white",
        actionButtonTooltip: "Imports the merge to branch of the PR and creates a new merge state between the two branches tracked in Dataspecer",
      };
    }
    else if (isMergeFromForActionButtonInDS) {
      return {
        actionButtonText: "Import + Merge",
        actionButtonClassname: "border-1 bg-purple-100 border-purple-600 hover:bg-purple-600 hover:text-white text-sm font-semibold transition cursor-pointer dark:bg-purple-900 dark:border-purple-400 dark:hover:bg-purple-500 dark:hover:text-white",
        actionButtonTooltip: "Imports the merge from branch of the PR and creates a new merge state between the two branches tracked in Dataspecer",
      };
    }
    else {
      return {
        actionButtonText: "Import both + Merge",
        actionButtonClassname: "border-1 bg-orange-100 border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-semibold transition cursor-pointer dark:bg-orange-900 dark:border-orange-400 dark:hover:bg-orange-500 dark:hover:text-white",
        actionButtonTooltip: "Imports both the merge from and merge to branches into Dataspecer and creates a new merge state between them.",
      };
    }
  };

  const [closePrButtonData, isClosePrButtonNotReady] = useAsyncMemo(createActionButtonRenderData(false), []);
  const [reverseMergeButtonData, isReverseMergeButtonNotReady] = useAsyncMemo(createActionButtonRenderData(true), []);

  const createActionButtonOnClickHandler = (isReverseMerge: boolean) => async () => {
    const closeLoadingDialogObject = createCloseLoadingDialogObject();
    const isMergeFromForActionInDS = isReverseMerge ? isMergeToInDS : isMergeFromInDS;
    const isMergeToForActionInDS = isReverseMerge ? isMergeFromInDS : isMergeToInDS;

    let mergeFromIriForAction: string;
    let mergeToIriForAction: string;

    const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(resourceGitUrl, fetch, {});
    const repositoryOwner = gitProvider.extractPartOfRepositoryURL(resourceGitUrl, "repository-owner");
    const repositoryName = gitProvider.extractPartOfRepositoryURL(resourceGitUrl, "repository-name");
    if (repositoryOwner === null || repositoryName === null) {
      throw new Error(`For some reason the owner (${repositoryOwner} or name (${repositoryName}) of the Git URL ${resourceGitUrl} is not specified.`);
    }

    const mergeFromBranchUrl = gitProvider.createGitRepositoryURL(repositoryOwner, repositoryName, {type: "branch", name: pullRequestInfo.mergeFromBranch});
    const mergeToBranchUrl = gitProvider.createGitRepositoryURL(repositoryOwner, repositoryName, {type: "branch", name: pullRequestInfo.mergeToBranch});
    const mergeFromBranchUrlForAction = isReverseMerge ? mergeToBranchUrl : mergeFromBranchUrl;
    const mergeToBranchUrlForAction = isReverseMerge ? mergeFromBranchUrl : mergeToBranchUrl;

    const mergeFromBranchForAction = isReverseMerge ? pullRequestInfo.mergeToBranch : pullRequestInfo.mergeFromBranch;
    const mergeToBranchForAction = isReverseMerge ? pullRequestInfo.mergeFromBranch : pullRequestInfo.mergeToBranch;

    let performedImport: boolean = true;

    resolve(null);
    try {
      if (isMergeFromInDS && isMergeToInDS) {
        mergeFromIriForAction = isReverseMerge ? mergeToInDataspecer.iri : mergeFromInDataspecer.iri;
        mergeToIriForAction = isReverseMerge ? mergeFromInDataspecer.iri : mergeToInDataspecer.iri;

        const mergeState = isReverseMerge ? fetchedReverseMergeState : fetchedMergeState;

        performedImport = false;
        if (mergeState !== null) {
          openModal(
            TextDiffEditorDialog,
            {
              initialMergeFromRootMetaPath: mergeFromIriForAction,
              initialMergeToRootMetaPath: mergeToIriForAction,
              editable: mergeState.editable,
            }
          );
          return;
        }
      }
      else {
        if (isMergeFromForActionInDS) {
          // Add small delay so the second dialog appears after the first one is closed
          setTimeout(() => {
            const importedBranchType = isReverseMerge ? "merge from" : "merge to";
            openModal(LoadingDialog, {
              dialogTitle: `Importing the '${importedBranchType}' branch from the PR`,
              waitingText: `Branch name: ${mergeToBranchForAction}`,
              waitTime: GIT_IMPORT_WAIT_TIME,
              setCloseDialogAction: closeLoadingDialogObject.setCloseDialogAction,
              shouldShowTimer: true,
              shouldDisableClosing: true,
            });
          }, 40);
          const response = await importFromGit(PACKAGE_ROOT, mergeToBranchUrlForAction, "branch");
          const importedIris = await response.json();
          mergeFromIriForAction = isReverseMerge ? mergeToInDataspecer!.iri : mergeFromInDataspecer!.iri;
          mergeToIriForAction = importedIris[0];
        }
        else if (isMergeToForActionInDS) {
          // Add small delay so the second dialog appears after the first one is closed
          setTimeout(() => {
            const importedBranchType = isReverseMerge ? "merge to" : "merge from";
            openModal(LoadingDialog, {
              dialogTitle: `Importing the '${importedBranchType}' branch from the PR`,
              waitingText: `Branch name: ${mergeFromBranchForAction}`,
              waitTime: GIT_IMPORT_WAIT_TIME,
              setCloseDialogAction: closeLoadingDialogObject.setCloseDialogAction,
              shouldShowTimer: true,
              shouldDisableClosing: true,
            });
          }, 40);
          const response = await importFromGit(PACKAGE_ROOT, mergeFromBranchUrlForAction, "branch");
          const importedIris = await response.json();
          mergeFromIriForAction = importedIris[0];
          mergeToIriForAction = isReverseMerge ? mergeFromInDataspecer!.iri : mergeToInDataspecer!.iri;
        }
        else {
          setTimeout(() => {
            // Add small delay so the second dialog appears after the first one is closed
            openModal(LoadingDialog, {
              dialogTitle: "Importing the 'merge from' branch from the PR",
              waitingText: `Branch name: ${pullRequestInfo.mergeFromBranch}`,
              waitTime: GIT_IMPORT_WAIT_TIME,
              setCloseDialogAction: closeLoadingDialogObject.setCloseDialogAction,
              shouldShowTimer: true,
              shouldDisableClosing: true,
            });
          }, 40);
          const mergeFromFetchResponse = await importFromGit(PACKAGE_ROOT, mergeFromBranchUrl, "branch");
          const importedMergeFromIris = await mergeFromFetchResponse.json();

          if (isReverseMerge) {
            mergeToIriForAction = importedMergeFromIris[0];
          }
          else {
            mergeFromIriForAction = importedMergeFromIris[0];
          }

          closeLoadingDialogObject.closeDialogAction();
          setTimeout(() => {
            // Add small delay so the second dialog appears after the first one is closed
            openModal(LoadingDialog, {
              dialogTitle: "Importing the 'merge to' branch from the PR",
              waitingText: `Branch name: ${pullRequestInfo.mergeToBranch}`,
              waitTime: GIT_IMPORT_WAIT_TIME,
              setCloseDialogAction: closeLoadingDialogObject.setCloseDialogAction,
              shouldShowTimer: true,
              shouldDisableClosing: true,
            });
          }, 40);
          const mergeToFetchResponse = await importFromGit(PACKAGE_ROOT, mergeToBranchUrl, "branch");
          const importedMergeToIris = await mergeToFetchResponse.json();
          if (isReverseMerge) {
            mergeFromIriForAction = importedMergeToIris[0];
          }
          else {
            mergeToIriForAction = importedMergeToIris[0];
          }
        }
      }

      closeLoadingDialogObject.closeDialogAction();
      setTimeout(() => {
        // Add small delay so the second dialog appears after the first one is closed
        openModal(LoadingDialog, {
          dialogTitle: "Creating merge state",
          waitingText: `"${mergeFromBranchForAction}" -> "${mergeToBranchForAction}"`,
          waitTime: CREATE_MERGE_STATE_WAIT_TIME,
          setCloseDialogAction: closeLoadingDialogObject.setCloseDialogAction,
          shouldShowTimer: true,
          shouldDisableClosing: true,
        });
      }, 40);

      const { error: createMergeStateError } = await createMergeStateOnBackend(mergeFromIriForAction!, mergeToIriForAction!);
      requestLoadPackage(mergeFromIriForAction!, true);
      requestLoadPackage(mergeToIriForAction!, true);
      if (performedImport) {
        requestLoadPackage(PACKAGE_ROOT, true);
      }

      if (createMergeStateError === null) {
        toast.success("The creation of merge state succeeded");
        openModal(
          TextDiffEditorDialog,
          {
            initialMergeFromRootMetaPath: mergeFromIriForAction!,
            initialMergeToRootMetaPath: mergeToIriForAction!,
            editable: "mergeTo",
          }
        );
      }
      else {
        toast.error("The creation of merge state failed", { "richColors": true });
      }
    }
    catch (error) {
      throw error;
    }
    finally {
      closeLoadingDialogObject.closeDialogAction();
    }
  };

  // The close PR does not have the actors swapped why the merge into the merge from branch does.
  const closePrOnClickAction = createActionButtonOnClickHandler(false);
  const reverseMergeOnClickAction = createActionButtonOnClickHandler(true);


  // We have to use the hoveredOn, because otherwise if we hover on the action button, we highlight the whole line since the hover on also works on the whole div, which we do not want.
  return <div className={"grid grid-cols-[4fr_2fr_2fr_3fr_3fr_2fr_1.5fr_1.5fr] divide-x divide-y divide-gray-300 ml-4 w-full cursor-pointer" + ((!hoveredOnActionButton && hoveredOnNotActionButton) ? " hover:bg-gray-200 dark:hover:bg-gray-700 dark:hover:text-white-400" : "")}>
    <div onClick={() => createNewTabAndOpen(pullRequestInfo.urlToPR)} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="flex justify-center items-center border-gray-300">{pullRequestInfo.title}</div>
    <div onClick={() => createNewTabAndOpen(pullRequestInfo.urlToPR)} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="flex justify-center items-center">{new Date(pullRequestInfo.createdAt).toLocaleString()}</div>
    <div onClick={() => createNewTabAndOpen(pullRequestInfo.urlToPR)} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="flex justify-center items-center">{new Date(pullRequestInfo.modifiedAt).toLocaleString()}</div>
    <div onClick={() => createNewTabAndOpen(pullRequestInfo.urlToPR)} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="flex justify-center items-center">{pullRequestInfo.mergeFromBranch}</div>
    <div onClick={() => createNewTabAndOpen(pullRequestInfo.urlToPR)} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="flex justify-center items-center">{pullRequestInfo.mergeToBranch}</div>
    <div onClick={() => createNewTabAndOpen(pullRequestInfo.urlToPR)} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="border-r border-b border-gray-300">
      <div className="flex justify-center items-center text-green-600">+{pullRequestInfo.additions}</div>
      <div className="flex justify-center items-center text-red-600">-{pullRequestInfo.deletions}</div>
    </div>
    {!isReverseMergeButtonNotReady && reverseMergeButtonData !== undefined &&
      <button
        className={"flex justify-center items-center cursor-pointer " + reverseMergeButtonData.actionButtonClassname}
        onClick={reverseMergeOnClickAction}
        onMouseEnter={() => setHoveredOnActionButton(true)}
        onMouseLeave={() => setHoveredOnActionButton(false)}
      >
        {reverseMergeButtonData.actionButtonText}
      </button>
    }
    {!isClosePrButtonNotReady && closePrButtonData !== undefined &&
      <button
        className={"flex justify-center items-center cursor-pointer " + closePrButtonData.actionButtonClassname}
        onClick={closePrOnClickAction}
        onMouseEnter={() => setHoveredOnActionButton(true)}
        onMouseLeave={() => setHoveredOnActionButton(false)}
      >
        {closePrButtonData.actionButtonText}
      </button>
    }
  </div>;
}
