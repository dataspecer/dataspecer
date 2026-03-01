import { redirectToPage } from "@/components/login-card";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { usePaginationComponent } from "@/components/pagination-component";
import { Button } from "@/components/ui/button";
import { useAsyncMemo } from "@/hooks/use-async-memo";
import { BetterModalProps } from "@/lib/better-modal";
import { GitIssueInfo, GitIssuesFetchResponse, GitProvider, IssueState } from "@dataspecer/git";
import { GitProviderFactory } from "@dataspecer/git/git-providers";
import { Loader } from "lucide-react";
import { useMemo } from "react";


type GitIssuesListDialogProps = {
  gitUrl: string;
} & BetterModalProps<null>;


/**
 * @todo Lists only the opened issues - see IssueState.Open in the backend request
 * @todo In some things similar to the PR component, there could be probably be one generic component which builds it.
 *  But 1) It is extra work 2) The end result general component may be hard to read/modify.
 *   Thereofre, the code duplication is fine. Well it is not that much of a code duplicaiton but rather sharing structure.
 */
export function GitIssuesListDialog({ gitUrl, isOpen, resolve }: GitIssuesListDialogProps) {
  // Uses the PaginationComponent from the hook to render the pagination.
  const {
    pageOnFrontend, trackedPageOnBackend, setIsLastPageBasedOnServerResponse, setTrackedPageOnBackend,
    itemCountPerPage, setTotalItemCount, PaginationComponent
  } = usePaginationComponent();

  const gitProvider: GitProvider = useMemo(() => {
    return GitProviderFactory.createGitProviderFromRepositoryURL(gitUrl, fetch, null);
  }, []);

  const [gitIssues, cannotUseGitIssues] = useAsyncMemo(async () => {
    const issuesFetchUrl: string = import.meta.env.VITE_BACKEND + `/git/issues?gitUrl=${gitUrl}&issueState=${IssueState.Open}&page=${trackedPageOnBackend}&perPage=${itemCountPerPage}`;

    // Optimization - we start this request without await and handle it in the .then, this measn that we can move on to the other fetch while this one is being performed.
    const issueCountFetchUrl: string = import.meta.env.VITE_BACKEND + `/git/issue-total-count?gitUrl=${gitUrl}&issueState=${IssueState.Open}`;
    fetch(
      issueCountFetchUrl,
      {
        credentials: "include",         // Important, without this we don't send the authorization cookies
        method: "GET",
      })
      .then(async (issueCountFetchResponse) => {
         const issueTotalCount: number = (await issueCountFetchResponse.json());
         setTotalItemCount(issueTotalCount);
      });


    const issuesFetchResponse = await fetch(
      issuesFetchUrl,
      {
        credentials: "include",         // Important, without this we don't send the authorization cookies
        method: "GET",
      });
    const gitIssuesResponseData: GitIssuesFetchResponse = await issuesFetchResponse.json();

    setTrackedPageOnBackend(gitIssuesResponseData.page);
    setIsLastPageBasedOnServerResponse(gitIssuesResponseData.isLastPage);
    return gitIssuesResponseData.issues;
  }, [pageOnFrontend, itemCountPerPage]);


  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className={"min-w-[80%] overflow-x-auto"}>
        <ModalHeader>
          <ModalTitle>List of opened issues</ModalTitle>
          <ModalDescription>
            You can click on the issues and get redirected to them. You can also click on the 'Create new issue' to get redirected on the corresponding page.
          </ModalDescription>
          {
            cannotUseGitIssues ? <Loader className="mr-2 mt-1 h-4 w-4 animate-spin" /> :
            <div className=" w-full">
              <div className="grid grid-cols-[4fr_2fr_2fr_3fr_3fr] divide-x divide-y border-gray-300 divide-gray-300 ml-4 pt-6 w-full">
                <div className="flex items-center justify-center border-gray-300">Title</div>
                <div className="flex items-center justify-center">Created at</div>
                <div className="flex items-center justify-center">Last activity at</div>
                <div className="flex items-center justify-center">Author</div>
                <div className="flex items-center justify-center border-gray-300 border-b">labels</div>
              </div>
              {gitIssues?.map(gitIssue => <GitIssueComponent gitIssueInfo={gitIssue}/>) ?? null}
            </div>
          }
          {
            cannotUseGitIssues ? null : <PaginationComponent items={gitIssues!} itemsOnPageScalingFactor={1} isPageNumberingExact={false}
                                                             itemCountOnPageText="Issues on page" totalItemCountText="Total issue count"/>
          }
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => resolve(null)}>Close</Button>
          <Button variant="default" onClick={() => { redirectToPage(gitProvider.getCreateNewIssueUrl(gitUrl)); resolve(null); }}>Create new issue</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}


type GitIssueComponentProps = {
  gitIssueInfo: GitIssueInfo;
}

function GitIssueComponent({ gitIssueInfo }: GitIssueComponentProps) {
  return <a href={gitIssueInfo.urlToIssue} className={"grid grid-cols-[4fr_2fr_2fr_3fr_3fr] divide-x divide-y divide-gray-300 pt-1 ml-4 w-full cursor-pointer hover:bg-gray-200"}>
    <div className="flex justify-center items-center border-gray-300">{gitIssueInfo.title}</div>
    <div className="flex justify-center items-center">{new Date(gitIssueInfo.createdAt).toLocaleString()}</div>
    <div className="flex justify-center items-center">{new Date(gitIssueInfo.lastActivityAt).toLocaleString()}</div>
    <div className="flex justify-center items-center">{gitIssueInfo.author}</div>
    <div className="flex flex-wrap justify-center items-center pl-2 border-gray-300 border-b pb-1">
      {
        gitIssueInfo.labels.map(label => {
          return <span className="flex justify-center items-center inline-block px-2 py-1 mr-1 rounded" style={{backgroundColor: `#${label.color}`}}>{label.name}</span>;
        })
      }
      </div>
  </a>;
}
