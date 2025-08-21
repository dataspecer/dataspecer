import { modifyPackageRepresentsBranchHead, requestLoadPackage } from "@/package";

// TODO RadStr: Maybe move into package?
export function convertToValidRepositoryName(repoName: string): string {
  // Based on ChatGPT
  console.info("Repo name before:", repoName);
  const validRepoName = repoName.trim().replace(/\s+/g, " ").replace(/ /g, "-");
  console.info("Repo name after:", validRepoName);
  return validRepoName;
}

// TODO RadStr: Put into /packages - we need this from both manager and services/backend
export enum ConfigType {
  LoginInfo,
  FullPublicRepoControl,
  DeleteRepoControl,      // TODO RadStr: This is just for debugging, normal user won't use this ever (he could, but I would not trust 3rd party software with removal access).
}

/**
 * TODO RadStr: Maybe not utility function, but can't think of better place now
 */
export async function removeGitLinkFromPackage(iri: string) {
  const removeFetchURL = import.meta.env.VITE_BACKEND + "/git/remove-git-repository?iri=" + encodeURIComponent(iri);
  await fetch(
    removeFetchURL,
    {
      credentials: "include",         // TODO RadStr: Important, without this we don't send the authorization cookies.
      method: "GET",
    }
  );

  requestLoadPackage(iri, true);
}

// TODO RadStr: Maybe once again put elsewhere, since it is not really a utility function
export async function switchRepresentsBranchHead(iri: string, isCurrentlyRepresentingBranchHead: boolean) {
  await modifyPackageRepresentsBranchHead(iri, !isCurrentlyRepresentingBranchHead);
  await requestLoadPackage(iri, true);
}