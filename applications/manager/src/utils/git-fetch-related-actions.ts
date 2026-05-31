import { modifyPackageProjectData, modifyPackageRepresentsBranchHead, requestLoadPackage } from "@/package";
import { Package } from "@dataspecer/core-v2/project";
import { toast } from "sonner";
import { gitOperationResultToast } from "./utilities";
import { BranchAction, CreateNewBranchDialog } from "@/dialog/create-new-branch";
import { OpenBetterModal } from "@/lib/better-modal";
import { TFunction } from "i18next";
import { ErrorDefinitionConstantsClass } from "@dataspecer/git";


export async function manualPull(t: TFunction<"translation", undefined>, iri: string): Promise<boolean> {
  let isPullSuccess: boolean;
  const fetchUrl = import.meta.env.VITE_BACKEND + "/git/pull?iri=" + encodeURIComponent(iri);

  toast.info(t("Started git pull. It may take a moment for large dataspecs."));
  const response = await fetch(fetchUrl, {
    method: "GET",
  });

  if (response.status === 200) {
    isPullSuccess = true;
    toast.success(t("git pull went ok, there were no conflicts"));
  }
  else if (response.status === 204) {
    isPullSuccess = true;
    toast.success(t("The DS last commit hash already matched the Git one"))
  }
  else if (response.status >= 500) {
    isPullSuccess = false;
    // TODO RadStr: Localization
    const responseJson = await response.json();
    if (responseJson?.startsWith?.(ErrorDefinitionConstantsClass.convertToFrontendResponseMessage(ErrorDefinitionConstantsClass.INVALID_FORMAT_ON_PULL))) {
      toast.error(`${ErrorDefinitionConstantsClass.INVALID_FORMAT_ON_PULL} Check console for more info`, { "richColors": true });
    }
    else {
      console.error("Check if the remote follows the [.name.type.format] naming and each resource has .meta file or if it has valid format.");
      toast.error("There was an error during the git pull. Check console", { "richColors": true });
    }
    console.error(responseJson);
  }
  else {
    isPullSuccess = false;
    toast.error(t("There were conflicts in the git pull, resolve them in DS", { "richColors": true }));
  }
  await requestLoadPackage(iri, true);
  return isPullSuccess;
}


export async function removeGitLinkFromPackage(t: TFunction<"translation", undefined>, iri: string) {
  const removeFetchURL = import.meta.env.VITE_BACKEND + "/git/remove-git-repository?iri=" + encodeURIComponent(iri);
  const response = await fetch(
    removeFetchURL,
    {
      credentials: "include",         // Important, without this we don't send the authorization cookies.
      method: "GET",
    }
  );

  const jsonResponse = await response.json();
  const irisToUpdate = jsonResponse?.irisToUpdate ?? [];
  for (const iriToUpdate of irisToUpdate) {
    await requestLoadPackage(iriToUpdate, true);
  }

  if (response.status === 403) {
    toast.error("Unauthorized - Cannot remove Git repository", { "richColors": true });
  }
  else {
    gitOperationResultToast(t, response);
  }
  if (!response.ok) {
    console.error(jsonResponse);
  }
}

export async function switchRepresentsBranchHead(examinedPackage: Package, openModal: OpenBetterModal) {
  const { iri, projectIri, representsBranchHead: isCurrentlyRepresentingBranchHead } = examinedPackage;
  if (isCurrentlyRepresentingBranchHead) {
    const lastCommitHash = examinedPackage.lastCommitHash;
    await modifyPackageRepresentsBranchHead(iri, !isCurrentlyRepresentingBranchHead);
    await modifyPackageProjectData(iri, projectIri, lastCommitHash);
    await requestLoadPackage(iri, true);
  }
  else {
    openModal(CreateNewBranchDialog, { sourcePackage: examinedPackage, actionOnConfirm: BranchAction.TurnExistingIntoBranch });
  }
}


export async function checkIfHashMatchesGitRemote(
  gitUrl: string,
  hash: string,
  branch: string
) {
  const params: string = "repositoryUrl=" + encodeURIComponent(gitUrl) +
    "&hash=" + hash +
    "&branch=" + branch;

  const url = import.meta.env.VITE_BACKEND + "/git/check-if-hash-matches-git-remote?" + params;
  const response = await fetch(
    url,
    {
      credentials: "include",         // Important, without this we don't send the authorization cookies.
      method: "GET",
    }
  );

  if (response.ok) {
    toast.success("Merge state matches latest remote Git commit hash.");
  }
  else {
    if (response.status === 404) {
      console.error("The repository or branch does not exist.");
      toast.error("The repository or branch does not exist.", { richColors: true });
    }
    else if(response.status === 409) {
      console.error(`Remote Git contains new commit. The merge state is no longer up to date. The branch local hash (${hash}) does not matches the HEAD of the remote Git branch (branch name: ${branch})`);
      toast.error("Remote Git contains new commit, the merge state is no longer up to date.", { richColors: true });
    }
    else {
      console.error(await response.json());
      toast.error("Some unknown error. Check console.", { richColors: true });
    }
  }

  return response.ok;
}


/**
 * Compares remote Git package with the package in DS and sets the is up to date flag based on if the packages is up to date with the Git Remote or not.
 * @param targetedUpToDatePackagePrefixLabel is the name to use in the toast before the 'package' word - it can be for example 'merge to'
 */
export async function trySetPackageAsUpToDate(
  iri: string,
  targetedUpToDatePackagePrefixLabel?: string,
) {
  targetedUpToDatePackagePrefixLabel = "";

  const url = import.meta.env.VITE_BACKEND + "/git/try-set-package-as-up-to-date?iri=" + encodeURIComponent(iri);
  const response = await fetch(
    url,
    {
      credentials: "include",         // Important, without this we don't send the authorization cookies.
      method: "GET",
    }
  );

  if (response.ok) {
    if (response.status === 200) {
      toast.success(`${targetedUpToDatePackagePrefixLabel} package marked as up to date.`, { richColors: true });
    }
    else {
      toast.error(`${targetedUpToDatePackagePrefixLabel} package marked as having uncommitted changes.`, { richColors: true });
    }
  }
  else {
    if (response.status === 404) {
      toast.error(`The remote already moved. Pull changes to ${ targetedUpToDatePackagePrefixLabel} package first.`, { "richColors": true });
    }
    else {
      toast.error(`Unknown error when comparing ${targetedUpToDatePackagePrefixLabel} package with the Git remote to check for changes.`, { "richColors": true });
    }
  }

  requestLoadPackage(iri, true);
  return response;
}
