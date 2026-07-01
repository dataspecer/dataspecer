import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { useAsyncMemo } from "@/hooks/use-async-memo";
import { BetterModalProps, useBetterModal } from "@/lib/better-modal";
import { requestLoadPackage, ResourceWithIris } from "@/package";
import { MergeState, PACKAGE_ROOT, PullRequestFetchResponse, PullRequestInfo } from "@dataspecer/git";
import { Loader } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { createNewTabAndOpen } from "./advanced-sign-in";


type GitPrsListDialogProps = {
  branch: string | null;
  gitUrl: string;
  resources: Record<string, ResourceWithIris>;
  gitProviderSpecificNameForPR: string;
  gitProviderSpecificNameForPRShortcut: string;
} & BetterModalProps<null>;


/**
 * Shows the pull requests (or whatever the name is for the specific Git provider) for the given gitUrl.
 * If the provided branch is null then it lists all PRs for resource.
 */
export const GitPrsListDialog = ({ resources, branch, gitUrl, gitProviderSpecificNameForPR, gitProviderSpecificNameForPRShortcut, isOpen, resolve }: GitPrsListDialogProps) => {
  // Uses the PaginationComponent from the hook to render the pagination.
  const { t } = useTranslation();
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
            {branch === null ?
              t("git-prs-list.title.all", { gitProviderSpecificNameForPR, gitProviderSpecificNameForPRShortcut }) :
              t("git-prs-list.title.branch", { gitProviderSpecificNameForPR, gitProviderSpecificNameForPRShortcut })
            }
          </ModalTitle>
          <ModalDescription>
            {branch === null ? null : <p>{t("git-prs-list.description.branch")}</p>}
            <p>{t("git-prs-list.description.warning.line.one", { gitProviderSpecificNameForPRShortcut })} {t("git-prs-list.description.warning.line.two", { gitProviderSpecificNameForPRShortcut })}</p>
            <p className="flex flex-1 flex-row">{t("git-prs-list.description.warning.line.three", { gitProviderSpecificNameForPRShortcut })}
              <PRMergeTooltip gitProviderSpecificNameForPRShortcut={gitProviderSpecificNameForPRShortcut} isSpecificBranchPRsList={branch !== null} />
            </p>
          </ModalDescription>
          {
            cannotUseOpenedPrs ? <Loader className="mr-2 mt-1 h-4 w-4 animate-spin" /> :
            <div className=" w-full max-h-[95%]">
              <div className="grid grid-cols-[4fr_2fr_2fr_3fr_3fr_2fr_1.5fr_1.5fr] divide-x divide-y border-gray-300 divide-gray-300 ml-4 pt-6 w-full">
                <div className="flex items-center justify-center border-gray-300">{t("git-prs-list.table.title")}</div>
                <div className="flex items-center justify-center">{t("git-prs-list.table.created-at")}</div>
                <div className="flex items-center justify-center">{t("git-prs-list.table.modified-at")}</div>
                <div className="flex items-center justify-center">{t("git-prs-list.table.merge-from")}</div>
                <div className="flex items-center justify-center">{t("git-prs-list.table.merge-to")}</div>
                <div className="flex items-center justify-center border-gray-300 border-b border-r">{t("git-prs-list.table.add-del")}</div>
                <div className="flex items-center justify-center border-gray-300">{t("git-prs-list.table.reverse-merge")}</div>
                <div className="flex items-center justify-center border-gray-300">{t("git-prs-list.table.merge-pr", { gitProviderSpecificNameForPRShortcut })}</div>
              </div>
              <div className="w-full">
                {openedPrs?.map(pr => <PullRequestComponent pullRequestInfo={pr} resources={resources} resourceGitUrl={gitUrl} resolve={resolve}/>) ?? null}
              </div>
            </div>
          }
          {
            cannotUseOpenedPrs ? null : <PaginationComponent items={openedPrs!} itemsOnPageScalingFactor={1} isPageNumberingExact={branch === null}
                                                             itemCountOnPageText={t("git-prs-list.pagination.count-on-page", { gitProviderSpecificNameForPRShortcut })} totalItemCountText={t("git-prs-list.pagination.count-total", { gitProviderSpecificNameForPRShortcut })}/>
          }
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => resolve(null)}>{t("close")}</Button>
          <Button variant="default" onClick={() => createNewTabAndOpen(gitProvider.getUrlToPRs(gitUrl))}>{t("git-prs-list.buttons.visit-page-with-prs")}</Button>
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
  const { t } = useTranslation();

  return <div>
    <PopOverGitGeneralComponent>
      <div>{t("git-prs-list.tooltip.line.one")}</div>
      <div>{t("git-prs-list.tooltip.line.two", { gitProviderSpecificNameForPRShortcut })}</div>
      <div>{t("git-prs-list.tooltip.line.three", { gitProviderSpecificNameForPRShortcut })}</div>
      <div>{t("git-prs-list.tooltip.buttons-description")}</div>
      <div><p className="text-blue-600 inline">{t("git-prs-list.tooltip.open-merge-state.part.one")}</p>{t("git-prs-list.tooltip.open-merge-state.part.two")}</div>
      <div><p className="text-green-600 inline">{t("git-prs-list.tooltip.merge.part.one")}</p>{t("git-prs-list.tooltip.merge.part.two")}</div>
      <div><p className="text-purple-600 inline">{t("git-prs-list.tooltip.import-merge.part.one")}</p>{t("git-prs-list.tooltip.import-merge.part.two")}</div>
      {isSpecificBranchPRsList ? null : <div><p className="text-orange-600 inline">{t("git-prs-list.tooltip.import-both-merge.part.one")}</p>{t("git-prs-list.tooltip.import-both-merge.part.two")}</div>}
    </PopOverGitGeneralComponent>
  </div>;
}


type PullRequestComponentProps = {
  pullRequestInfo: PullRequestInfo;
  resources: Record<string, ResourceWithIris>;
  resourceGitUrl: string;
  resolve: (value: null) => void;
}

/**
 * Handles rendering of a single pull request. The main logic is in deciding what actions buttons to show and what they do.
 *  The action buttons are:
 *   - Open merge state
 *   - Create merge state
 *   - Import one missing data specification and create merge state
 *   - Import both missing data specifications and create merge state
 */
function PullRequestComponent({ pullRequestInfo, resources, resourceGitUrl, resolve }: PullRequestComponentProps) {
  const { t } = useTranslation();
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
          actionButtonText: t("git-prs-list.action.open-merge-state"),
          actionButtonClassname: "border-1 bg-blue-100 border-blue-600 hover:bg-blue-600 hover:text-white text-sm font-semibold transition cursor-pointer dark:bg-blue-900 dark:border-blue-400 dark:hover:bg-blue-500 dark:hover:text-white",
          actionButtonTooltip: t("git-prs-list.action.open-merge-state-tooltip"),
        };
      }
      else {
        return {
          actionButtonText: t("git-prs-list.action.merge"),
          actionButtonClassname: "border-1 bg-green-100 border-green-600 hover:bg-green-600 hover:text-white text-sm font-semibold transition cursor-pointer dark:bg-green-900 dark:border-green-400 dark:hover:bg-green-500 dark:hover:text-white",
          actionButtonTooltip: t("git-prs-list.action.merge-tooltip"),
        };
      }
    }
    else if (isMergeToForActionButtonInDS) {
      return {
        actionButtonText: t("git-prs-list.action.import-merge"),
        actionButtonClassname: "border-1 bg-purple-100 border-purple-600 hover:bg-purple-600 hover:text-white text-sm font-semibold transition cursor-pointer dark:bg-purple-900 dark:border-purple-400 dark:hover:bg-purple-500 dark:hover:text-white",
        actionButtonTooltip: t("git-prs-list.action.import-merge-tooltip.merge-to-branch"),
      };
    }
    else if (isMergeFromForActionButtonInDS) {
      return {
        actionButtonText: t("git-prs-list.action.import-merge"),
        actionButtonClassname: "border-1 bg-purple-100 border-purple-600 hover:bg-purple-600 hover:text-white text-sm font-semibold transition cursor-pointer dark:bg-purple-900 dark:border-purple-400 dark:hover:bg-purple-500 dark:hover:text-white",
        actionButtonTooltip: t("git-prs-list.action.import-merge-tooltip.merge-from-branch"),
      };
    }
    else {
      return {
        actionButtonText: t("git-prs-list.action.import-both-merge"),
        actionButtonClassname: "border-1 bg-orange-100 border-orange-600 hover:bg-orange-600 hover:text-white text-sm font-semibold transition cursor-pointer dark:bg-orange-900 dark:border-orange-400 dark:hover:bg-orange-500 dark:hover:text-white",
        actionButtonTooltip: t("git-prs-list.action.import-both-merge-tooltip"),
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
            const importedBranchType = isReverseMerge ? t("git-prs-list.loading.branch-type.merge-from") : t("git-prs-list.loading.branch-type.merge-to");
            openModal(LoadingDialog, {
              dialogTitle: t("git-prs-list.loading.import-branch", { importedBranchType }),
              waitingText: t("git-prs-list.loading.branch-name", { branchName: mergeToBranchForAction }),
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
            const importedBranchType = isReverseMerge ? t("git-prs-list.loading.branch-type.merge-to") : t("git-prs-list.loading.branch-type.merge-from");
            openModal(LoadingDialog, {
              dialogTitle: t("git-prs-list.loading.import-branch", { importedBranchType }),
              waitingText: t("git-prs-list.loading.branch-name", { branchName: mergeFromBranchForAction }),
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
              dialogTitle: t("git-prs-list.loading.import-branch", { importedBranchType: t("git-prs-list.loading.branch-type.merge-from") }),
              waitingText: t("git-prs-list.loading.branch-name", { branchName: pullRequestInfo.mergeFromBranch }),
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
              dialogTitle: t("git-prs-list.loading.import-branch", { importedBranchType: t("git-prs-list.loading.branch-type.merge-to") }),
              waitingText: t("git-prs-list.loading.branch-name", { branchName: pullRequestInfo.mergeToBranch }),
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
          dialogTitle: t("git-prs-list.loading.creating-merge-state"),
          waitingText: t("git-prs-list.loading.merge-branch-path", { mergeFromBranch: mergeFromBranchForAction, mergeToBranch: mergeToBranchForAction }),
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
        toast.success(t("git-prs-list.toast.create-merge-state-success"));
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
        toast.error(t("git-prs-list.toast.create-merge-state-failed"), { "richColors": true });
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
