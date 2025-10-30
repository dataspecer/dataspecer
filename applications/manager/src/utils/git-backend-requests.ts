import { ExportFormatType } from "@/components/export-format-radio-buttons";


export async function commitToGitRequest(
  iri: string,
  commitMessage: string | null,
  exportFormat: string,
  shouldAlwaysCreateMergeState: boolean,
  shouldRedirectWithExistenceOfMergeStates: boolean,
) {
  const url = import.meta.env.VITE_BACKEND + "/git/commit-package-to-git?iri=" + encodeURIComponent(iri) +
                                              "&commitMessage=" + encodeURIComponent(commitMessage ?? "") +
                                              "&exportFormat=" + exportFormat +
                                              "&shouldAlwaysCreateMergeState=" + shouldAlwaysCreateMergeState +
                                              "&shouldRedirectWithExistenceOfMergeStates=" + shouldRedirectWithExistenceOfMergeStates;
  const response = await fetch(
    url,
    {
      credentials: "include",         // Important, without this we don't send the authorization cookies
      method: "GET",
    });
  return response;
}

export async function mergeCommitToGitRequest(
  iri: string,
  commitMessage: string | null,
  exportFormat: string,
  branchMergeFrom: string,
  lastCommitHashMergeFrom: string,
  rootIriMergeFrom: string,
) {
  const url = import.meta.env.VITE_BACKEND + "/git/merge-commit-package-to-git?iri=" + encodeURIComponent(iri) +
                                              "&commitMessage=" + encodeURIComponent(commitMessage ?? "") +
                                              "&exportFormat=" + exportFormat +
                                              "&branchMergeFrom=" + branchMergeFrom +
                                              "&lastCommitHashMergeFrom=" + lastCommitHashMergeFrom +
                                              "&rootIriMergeFrom=" + rootIriMergeFrom;
  const response = await fetch(
    url,
    {
      credentials: "include",         // Important, without this we don't send the authorization cookies
      method: "GET",
    });
  return response;
}

export type CommitBackendRequestData = {
  repositoryName: string;
  user: string;
  gitProvider: string;
  commitMessage: string;
  isUserRepo: boolean;
  exportFormat: ExportFormatType;
}

export async function createNewRemoteRepositoryRequest(
  iri: string,
  commitBackendRequestData: CommitBackendRequestData,
) {
  const url = import.meta.env.VITE_BACKEND + "/git/create-new-git-repository-with-package-content?iri=" + encodeURIComponent(iri) +
                                            "&givenRepositoryName=" + encodeURIComponent(commitBackendRequestData.repositoryName) +
                                            "&givenUserName=" + encodeURIComponent(commitBackendRequestData.user ?? "") +
                                            "&gitProviderURL=" + encodeURIComponent(commitBackendRequestData.gitProvider ?? "") +
                                            "&commitMessage=" + encodeURIComponent(commitBackendRequestData.commitMessage ?? "") +
                                            "&isUserRepo=" + encodeURIComponent(commitBackendRequestData.isUserRepo ?? true) +
                                            "&exportFormat=" + commitBackendRequestData.exportFormat;
  // TODO RadStr: To test with docker I put the link-package-to-git code into export.zip, because for some reason docker didn't work with new API points
  // const url = import.meta.env.VITE_BACKEND + "/resources/export.zip?iri=" + encodeURIComponent(iri) +
  //                                           "&givenRepositoryName=" + encodeURIComponent(commitBackendRequestData.inputByUser) +
  //                                           "&givenUserName=" + encodeURIComponent(commitBackendRequestData.user ?? "") +
  //                                           "&gitProviderURL=" + encodeURIComponent(commitBackendRequestData.gitProvider ?? "") +
  //                                           "&commitMessage=" + encodeURIComponent(commitBackendRequestData.commitMessage ?? "");
  const response = await fetch(
    url,
    {
      credentials: "include",         // Important, without this we don't send the authorization cookies.
      method: "GET",
    });
  return response;
}

export async function linkToExistingGitRepositoryRequest(iri: string, remoteRepositoryURL: string) {
  const url = import.meta.env.VITE_BACKEND + "/git/link-to-existing-git-repository?iri=" + encodeURIComponent(iri) +
                                              "&repositoryURL=" + encodeURIComponent(remoteRepositoryURL);
  const response = await fetch(
    url,
    {
      // Note that we do not set the credentials here.
      method: "GET",
    });
  return response;
}
