import { ExportFormatType, ExportVersionType, MergeFromDataType, SingleBranchCommitType } from "@dataspecer/git";


export type GitMergeCommitData = {
  commitMessage: string | null;
  exportFormat: ExportFormatType;
  exportVersion: ExportVersionType;
}

export type GitCommitData = {
  shouldAlwaysCreateMergeState: boolean;
  commitType: SingleBranchCommitType;
} & GitMergeCommitData;

export async function commitToGitBackendRequest(
  iri: string,
  gitCommitData: GitCommitData,
  shouldRedirectWithExistenceOfMergeStates: boolean,
) {
  const { commitMessage, exportFormat, exportVersion, shouldAlwaysCreateMergeState, commitType } = gitCommitData;
  const url = import.meta.env.VITE_BACKEND + "/git/commit-package-to-git?iri=" + encodeURIComponent(iri) +
                                              "&commitMessage=" + encodeURIComponent(commitMessage ?? "") +
                                              "&exportFormat=" + exportFormat +
                                              "&exportVersion=" + exportVersion +
                                              "&shouldAlwaysCreateMergeState=" + shouldAlwaysCreateMergeState +
                                              "&shouldRedirectWithExistenceOfMergeStates=" + shouldRedirectWithExistenceOfMergeStates +
                                              "&commitType=" + commitType;
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

type CreateNewRepoBackendRequestData = {
  repositoryName: string;
  signedInUserOrOrganization: string | null;    // If null then it is bot
  gitProviderDomain: string;
  commitMessage: string;
  isUserRepo: boolean;
  publicationBranch: string;
  exportFormat: ExportFormatType;
  exportVersion: ExportVersionType;
}

export async function createNewRemoteRepositoryRequest(
  iri: string,
  createRepoBackendRequestData: CreateNewRepoBackendRequestData,
) {
  const signedInUserOrOrganizationUrlPart = createRepoBackendRequestData.signedInUserOrOrganization === null ?
    "" :
    "&signedInUserOrOrganization=" + encodeURIComponent(createRepoBackendRequestData.signedInUserOrOrganization);

  const url = import.meta.env.VITE_BACKEND + "/git/create-new-git-repository-with-package-content?iri=" + encodeURIComponent(iri) +
                                            "&givenRepositoryName=" + encodeURIComponent(createRepoBackendRequestData.repositoryName) +
                                            signedInUserOrOrganizationUrlPart +
                                            "&gitProviderURL=" + encodeURIComponent(createRepoBackendRequestData.gitProviderDomain ?? "") +
                                            "&commitMessage=" + encodeURIComponent(createRepoBackendRequestData.commitMessage ?? "") +
                                            "&isUserRepo=" + encodeURIComponent(createRepoBackendRequestData.isUserRepo ?? true) +
                                            "&publicationBranch=" + encodeURIComponent(createRepoBackendRequestData.publicationBranch) +
                                            "&exportFormat=" + createRepoBackendRequestData.exportFormat +
                                            "&exportVersion=" + createRepoBackendRequestData.exportVersion;
  const response = await fetch(
    url,
    {
      credentials: "include",         // Important, without this we don't send the authorization cookies.
      method: "GET",
    });
  return response;
}

/**
 * @todo TODO RadStr PR: For now unused. As explained in the 'Dir.tsx'.
 *                        Personally, I would just allow unlinking -
 *                         that is choose to remove the link to the remote repo.
 */
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
