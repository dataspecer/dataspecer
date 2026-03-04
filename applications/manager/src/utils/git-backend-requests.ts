import { ExportFormatType, ExportVersionType, MergeFromDataType } from "@dataspecer/git";


export type GitMergeCommitData = {
  commitMessage: string | null;
  exportFormat: ExportFormatType;
  exportVersion: ExportVersionType;
}

export type GitCommitData = {
  shouldAlwaysCreateMergeState: boolean;
} & GitMergeCommitData;

export async function commitToGitBackendRequest(
  iri: string,
  gitCommitData: GitCommitData,
  shouldRedirectWithExistenceOfMergeStates: boolean,
) {
  const { commitMessage, exportFormat, exportVersion, shouldAlwaysCreateMergeState } = gitCommitData;
  const url = import.meta.env.VITE_BACKEND + "/git/commit-package-to-git?iri=" + encodeURIComponent(iri) +
                                              "&commitMessage=" + encodeURIComponent(commitMessage ?? "") +
                                              "&exportFormat=" + exportFormat +
                                              "&exportVersion=" + exportVersion +
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

export async function mergeCommitToGitBackendRequest(
  iri: string,
  gitMergeCommitData: GitMergeCommitData,
  shouldAppendAfterDefaultMergeCommitMessage: boolean,
  mergeFrom: MergeFromDataType,
  shouldRedirectWithExistenceOfMergeStates: boolean
) {
  const url = import.meta.env.VITE_BACKEND + "/git/merge-commit-package-to-git?iri=" + encodeURIComponent(iri) +
                                              "&commitMessage=" + encodeURIComponent(gitMergeCommitData.commitMessage ?? "") +
                                              "&shouldAppendAfterDefaultMergeCommitMessage=" + shouldAppendAfterDefaultMergeCommitMessage +
                                              "&exportFormat=" + gitMergeCommitData.exportFormat +
                                              "&exportVersion=" + gitMergeCommitData.exportVersion +
                                              "&branchMergeFrom=" + mergeFrom.branch +
                                              "&lastCommitHashMergeFrom=" + mergeFrom.commitHash +
                                              "&rootIriMergeFrom=" + mergeFrom.iri +
                                              "&shouldRedirectWithExistenceOfMergeStates=" + shouldRedirectWithExistenceOfMergeStates;
  const response = await fetch(
    url,
    {
      credentials: "include",         // Important, without this we don't send the authorization cookies
      method: "GET",
    });
  return response;
}

type CreanteNewRepoBackendRequestData = {
  repositoryName: string;
  user: string;
  gitProvider: string;
  commitMessage: string;
  isUserRepo: boolean;
  publicationBranch: string;
  exportFormat: ExportFormatType;
  exportVersion: ExportVersionType;
}

export async function createNewRemoteRepositoryRequest(
  iri: string,
  commitBackendRequestData: CreanteNewRepoBackendRequestData,
) {
  const url = import.meta.env.VITE_BACKEND + "/git/create-new-git-repository-with-package-content?iri=" + encodeURIComponent(iri) +
                                            "&givenRepositoryName=" + encodeURIComponent(commitBackendRequestData.repositoryName) +
                                            "&givenRepositoryOwner=" + encodeURIComponent(commitBackendRequestData.user ?? "") +
                                            "&gitProviderURL=" + encodeURIComponent(commitBackendRequestData.gitProvider ?? "") +
                                            "&commitMessage=" + encodeURIComponent(commitBackendRequestData.commitMessage ?? "") +
                                            "&isUserRepo=" + encodeURIComponent(commitBackendRequestData.isUserRepo ?? true) +
                                            "&publicationBranch=" + encodeURIComponent(commitBackendRequestData.publicationBranch) +
                                            "&exportFormat=" + commitBackendRequestData.exportFormat +
                                            "&exportVersion=" + commitBackendRequestData.exportVersion;
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


export async function importFromGit(parentIri: string, gitUrl: string, importType?: "commit" | "branch") {
  let url = import.meta.env.VITE_BACKEND + "/resources/import-from-git?parentIri=" + encodeURIComponent(parentIri) + "&gitURL=" + encodeURIComponent(gitUrl);
  if (importType !== undefined) {
    url += "&commitReferenceType=" + importType;
  }
  return await fetch(url, {
    method: "POST",
  });
}