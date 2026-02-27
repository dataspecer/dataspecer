import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { useAsyncMemo } from "@/hooks/use-async-memo";
import { BetterModalProps, useBetterModal } from "@/lib/better-modal";
import { requestLoadPackage, ResourceWithIris } from "@/package";
import { MergeState, PACKAGE_ROOT, PullRequestFetchResponse, PullRequestInfo } from "@dataspecer/git";
import { Loader } from "lucide-react";
import { useState } from "react";
import { createMergeStateOnBackend, fetchMergeState } from "./open-merge-state";
import { importFromGit } from "@/utils/git-backend-requests";
import { GitProviderFactory } from "@dataspecer/git/git-providers";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { toast } from "sonner";
import { createCloseDialogObject, LoadingDialog } from "./loading-dialog";


type GitPrsListDialogProps = {
  branch: string;
  gitUrl: string;
  resources: Record<string, ResourceWithIris>;
} & BetterModalProps<null>;

export const GitPrsListDialog = ({ resources, branch, gitUrl, isOpen, resolve }: GitPrsListDialogProps) => {
  const [page, setPage] = useState<number>(1);
  const [itemCountPerPage, _setItemCountPerPage] = useState<number>(100);
  const [totalItemCount, setTotalItemCount] = useState<number>(0);
  const totalPageCount = Math.ceil(totalItemCount / itemCountPerPage);

  const [openedPrs, cannotUseOpenedPrs] = useAsyncMemo(async () => {
    const queryParams: Record<string, string | number> = {
      branch,
      gitUrl: encodeURIComponent(gitUrl),
      page,
      perPage: itemCountPerPage
    };
    let pullRequestsFetchUrl: string = import.meta.env.VITE_BACKEND + "/git/opened-pull-requests";
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
    return pullRequestResponseData.pullRequests;
  }, [page, itemCountPerPage]);


  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className={"min-w-[80%] overflow-x-auto"}>
        <ModalHeader>
          <ModalTitle>List of opened pull requests for given package and branch</ModalTitle>
          <ModalDescription>
            The PRs where one of the merge actors is the examined branch. You can click on the PR to get redirected to the PR.
            <br/>
            Resolving PR in DS means performing reverse merge. That is, from the merge to branch to the merge from and then finish the PR outside of DS.
          </ModalDescription>
          {
            cannotUseOpenedPrs ? <Loader className="mr-2 mt-1 h-4 w-4 animate-spin" /> :
            <div className=" w-full">
              <div className="grid grid-cols-[1.5fr_4fr_2fr_2fr_3fr_3fr_2fr] divide-x divide-y border-gray-300 divide-gray-300 ml-4 pt-6 w-full">
                <div className="flex items-center justify-center border-gray-300"></div>
                <div className="flex items-center justify-center border-gray-300">Title</div>
                <div className="flex items-center justify-center">Created at</div>
                <div className="flex items-center justify-center">Modified at</div>
                <div className="flex items-center justify-center">Merge from</div>
                <div className="flex items-center justify-center">Merge to</div>
                <div className="flex items-center justify-center border-gray-300 border-b border-r">Add/Del</div>
              </div>
              {openedPrs?.map(pr => <PullRequestComponent pullRequestInfo={pr} resources={resources} resourceGitUrl={gitUrl} resolve={resolve}/>) ?? null}
            </div>
          }
          {
            cannotUseOpenedPrs ? null : <div className="flex items-center justify-between">
              <div className="flex justify-center items-center text-sm">
                Total PR count: {totalItemCount}
              </div>
              <div className="flex justify-center items-center pt-4 space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((prevPage) => prevPage - 1)}
                  disabled={page === 1}
                  className=""
                >
                  Previous
                </Button>

                <span className="flex justify-center items-center text-sm">
                  Page {page} of {totalPageCount}
                </span>

                <Button
                  variant="outline"
                  onClick={() => setPage((prevPage) => prevPage + 1)}
                  disabled={page === totalPageCount}
                  className=""
                >
                  Next
                </Button>
              </div>
              <div className="flex justify-center items-center text-sm">
                {/* Per page: {itemCountPerPage * 2} */}
                PR count on page: {openedPrs?.length ?? 0}
              </div>
            </div>
          }
        </ModalHeader>
        {/* <ModalFooter>
          <Button variant="outline" onClick={() => resolve(null)}>Close</Button>
        </ModalFooter> */}
      </ModalContent>
    </Modal>
  );
};



type PullRequestComponentProps = {
  pullRequestInfo: PullRequestInfo;
  resources: Record<string, ResourceWithIris>;
  resourceGitUrl: string;
  resolve: (value: null) => void;
}

function PullRequestComponent({ pullRequestInfo, resources, resourceGitUrl, resolve }: PullRequestComponentProps) {
  const openModal = useBetterModal();
  const [fetchedMergeState, setFetchedMergeState] = useState<MergeState | null>(null);
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


  const [actionButtonData, isActionButtonNotReady] = useAsyncMemo(async () => {
    if (isMergeFromInDS && isMergeToInDS) {
      // Note that it is swapped - if we are resolving PR in Git we always first import the changes from the merge to branch to the merge from and then finish the PR outside of DS.
      const mergeStateFromBackend = await fetchMergeState(mergeToInDataspecer.iri, mergeFromInDataspecer.iri, true, false, false);
      setFetchedMergeState(mergeStateFromBackend);
      if (mergeStateFromBackend !== null) {
        return {
          actionButtonText: "Open",
          actionButtonClassname: "bg-green-400 hover:bg-green-600",
          actionButtonTooltip: "The merge state already exists in Dataspecer. The button opens it.",
        };
      }
      else {
        return {
          actionButtonText: "Create",
          actionButtonClassname: "bg-orange-200 hover:bg-orange-400",
          actionButtonTooltip: "Both branches are already tracked inside Dataspecer. This button will create new merge state between them",
        };
      }
    }
    else if (isMergeFromInDS) {
      return {
        actionButtonText: "Import + Create",
        actionButtonClassname: "bg-orange-400 hover:bg-orange-600",
        actionButtonTooltip: "Imports the merge to branch of the PR and creates a new merge state between the two branches tracked in Dataspecer",
      };
    }
    else if (isMergeToInDS) {
      return {
        actionButtonText: "Import + Create",
        actionButtonClassname: "bg-orange-400 hover:bg-orange-600",
        actionButtonTooltip: "Imports the merge from branch of the PR and creates a new merge state between the two branches tracked in Dataspecer",
      };
    }
    else {
      return {
        actionButtonText: "Import + Create",
        actionButtonClassname: "bg-orange-700 hover:bg-orange-800",
        actionButtonTooltip: "Imports both the merge from and merge to branches into Dataspecer and creates a new merge state between them.",
      };
    }
  }, []);

  const actionButton = async () => {
    const closeLoadingDialogObject = createCloseDialogObject();

    let mergeFromIri: string | null = null;
    let mergeToIri: string | null = null;

    const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(resourceGitUrl, fetch, {});
    const repositoryOwner = gitProvider.extractPartOfRepositoryURL(resourceGitUrl, "repository-owner");
    const repositoryName = gitProvider.extractPartOfRepositoryURL(resourceGitUrl, "repository-name");
    if (repositoryOwner === null || repositoryName === null) {
      throw new Error(`For some reason the owner (${repositoryOwner} or name (${repositoryName}) of the Git URL ${resourceGitUrl} is not specified.`);
    }

    const mergeFromBranchUrl = gitProvider.createGitRepositoryURL(repositoryOwner, repositoryName, {type: "branch", name: pullRequestInfo.mergeFromBranch});
    const mergeToBranchUrl = gitProvider.createGitRepositoryURL(repositoryOwner, repositoryName, {type: "branch", name: pullRequestInfo.mergeToBranch});
    let performedImport: boolean = true;

    try {
      if (isMergeFromInDS && isMergeToInDS) {
        performedImport = false;
        if (fetchedMergeState !== null) {
          resolve(null);
          openModal(
            TextDiffEditorDialog,
            {
              initialMergeFromRootMetaPath: mergeToInDataspecer.iri,
              initialMergeToRootMetaPath: mergeFromInDataspecer.iri,
              editable: fetchedMergeState.editable,
            }
          );
          return;
        }

        mergeFromIri = mergeFromInDataspecer.iri;
        mergeToIri = mergeToInDataspecer.iri;
      }
      else {
        resolve(null);
        if (isMergeFromInDS) {
          setTimeout(() => {
          // Add small delay so the second dialog appears after the first one is closed
            openModal(LoadingDialog, {
              dialogTitle: "Importing the 'merge to' branch from the PR",
              waitingText: `TODO RadStr: Replace me ... The branch name is ${pullRequestInfo.mergeToBranch}`,
              setCloseDialogAction: closeLoadingDialogObject.setCloseDialogAction,
              shouldShowTimer: true,
            });
          }, 40);
          const response = await importFromGit(PACKAGE_ROOT, mergeToBranchUrl, "branch");
          const importedIris = await response.json();
          mergeFromIri = mergeFromInDataspecer.iri;
          mergeToIri = importedIris[0];
        }
        else if (isMergeToInDS) {
          setTimeout(() => {
            // Add small delay so the second dialog appears after the first one is closed
            openModal(LoadingDialog, {
              dialogTitle: "Importing the 'merge from' branch from the PR",
              waitingText: `TODO RadStr: Replace me ... The branch name is ${pullRequestInfo.mergeFromBranch}`,
              setCloseDialogAction: closeLoadingDialogObject.setCloseDialogAction,
              shouldShowTimer: true,
            });
          }, 40);
          const response = await importFromGit(PACKAGE_ROOT, mergeFromBranchUrl, "branch");
          const importedIris = await response.json();
          mergeFromIri = importedIris[0];
          mergeToIri = mergeToInDataspecer.iri;
        }
        else {
          setTimeout(() => {
            // Add small delay so the second dialog appears after the first one is closed
            openModal(LoadingDialog, {
              dialogTitle: "Importing the 'merge from' branch from the PR",
              waitingText: `TODO RadStr: Replace me ... The branch name is ${pullRequestInfo.mergeFromBranch}`,
              setCloseDialogAction: closeLoadingDialogObject.setCloseDialogAction,
              shouldShowTimer: true,
            });
          }, 40);
          const mergeFromFetchResponse = await importFromGit(PACKAGE_ROOT, mergeFromBranchUrl, "branch");
          const importedMergeFromIris = await mergeFromFetchResponse.json();
          mergeFromIri = importedMergeFromIris[0];

          closeLoadingDialogObject.closeDialogAction();
          setTimeout(() => {
            // Add small delay so the second dialog appears after the first one is closed
            openModal(LoadingDialog, {
              dialogTitle: "Importing the 'merge to' branch from the PR",
              waitingText: `TODO RadStr: Replace me ... The branch name is ${pullRequestInfo.mergeToBranch}`,
              setCloseDialogAction: closeLoadingDialogObject.setCloseDialogAction,
              shouldShowTimer: true,
            });
          }, 40);
          const mergeToFetchResponse = await importFromGit(PACKAGE_ROOT, mergeToBranchUrl, "branch");
          const importedMergeToIris = await mergeToFetchResponse.json();
          mergeToIri = importedMergeToIris[0];
        }
      }

      closeLoadingDialogObject.closeDialogAction();
      setTimeout(() => {
        // Add small delay so the second dialog appears after the first one is closed
        openModal(LoadingDialog, {
          dialogTitle: "Creating merge state",
          waitingText: `TODO RadStr: Replace me ... From ${pullRequestInfo.mergeToBranch} to ${pullRequestInfo.mergeFromBranch}`,
          setCloseDialogAction: closeLoadingDialogObject.setCloseDialogAction,
          shouldShowTimer: true,
        });
      }, 40);

      const { error: createMergeStateError } = await createMergeStateOnBackend(mergeToIri!, mergeFromIri!);   // Again it is swapped
      requestLoadPackage(mergeToIri!, true);
      requestLoadPackage(mergeFromIri!, true);
      if (performedImport) {
        requestLoadPackage(PACKAGE_ROOT, true);
      }

      if (createMergeStateError === null) {
        toast.success("The creation of merge state succeeded");
        openModal(
          TextDiffEditorDialog,
          {
            initialMergeFromRootMetaPath: mergeToIri!,      // Again merge to and merge from swapped
            initialMergeToRootMetaPath: mergeFromIri!,
            editable: "mergeTo",
          }
        );
      }
      else {
        toast.error("The creation of merge state failed");
      }
    }
    catch (error) {
      throw error;
    }
    finally {
      closeLoadingDialogObject.closeDialogAction();
    }
  }


  // We have to use the hoveredOn, because otherwise if we hover on the action button, we highlight the whole line since the hover on also works on the whole div, which we do not want.
  return <div className={"grid grid-cols-[1.5fr_4fr_2fr_2fr_3fr_3fr_2fr] divide-x divide-y divide-gray-300 ml-4 w-full cursor-pointer" + ((!hoveredOnActionButton && hoveredOnNotActionButton) ? " hover:bg-gray-200" : "")}>
    {!isActionButtonNotReady && actionButtonData !== undefined &&
      <button
        className={"flex justify-center items-center cursor-pointer " + actionButtonData.actionButtonClassname}
        onClick={actionButton}
        onMouseEnter={() => setHoveredOnActionButton(true)}
        onMouseLeave={() => setHoveredOnActionButton(false)}
      >
        {actionButtonData.actionButtonText}
      </button>
    }
    <a href={pullRequestInfo.urlToPR} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="flex justify-center items-center border-gray-300">{pullRequestInfo.title}</a>
    <a href={pullRequestInfo.urlToPR} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="flex justify-center items-center">{new Date(pullRequestInfo.createdAt).toLocaleString()}</a>
    <a href={pullRequestInfo.urlToPR} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="flex justify-center items-center">{new Date(pullRequestInfo.modifiedAt).toLocaleString()}</a>
    <a href={pullRequestInfo.urlToPR} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="flex justify-center items-center">{pullRequestInfo.mergeFromBranch}</a>
    <a href={pullRequestInfo.urlToPR} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="flex justify-center items-center">{pullRequestInfo.mergeToBranch}</a>
    <a href={pullRequestInfo.urlToPR} onMouseEnter={() => setHoveredOnNotActionButton(true)} onMouseLeave={() => setHoveredOnNotActionButton(false)} className="border-r border-b border-gray-300">
      <div className="flex justify-center items-center text-green-600">+{pullRequestInfo.additions}</div>
      <div className="flex justify-center items-center text-red-600">-{pullRequestInfo.deletions}</div>
    </a>
  </div>;
}
