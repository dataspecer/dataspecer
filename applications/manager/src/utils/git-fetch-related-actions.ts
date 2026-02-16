import { modifyPackageProjectData, modifyPackageRepresentsBranchHead, requestLoadPackage } from "@/package";
import { Package } from "@dataspecer/core-v2/project";
import { toast } from "sonner";
import { gitOperationResultToast } from "./utilities";
import { BranchAction, CreateNewBranchDialog } from "@/dialog/create-new-branch";
import { OpenBetterModal } from "@/lib/better-modal";


export async function manualPull(iri: string) {
  const fetchUrl = import.meta.env.VITE_BACKEND + "/git/pull?iri=" + encodeURIComponent(iri);

  const response = await fetch(fetchUrl, {
    method: "GET",
  });

  if (response.ok) {
    toast.success("git pull went ok, there were no conflicts");
  }
  else {
    toast.error("There were conflicts in the git pull, resolve them in DS");
  }
  requestLoadPackage(iri, true);
}


export async function removeGitLinkFromPackage(iri: string) {
  const removeFetchURL = import.meta.env.VITE_BACKEND + "/git/remove-git-repository?iri=" + encodeURIComponent(iri);
  const response = await fetch(
    removeFetchURL,
    {
      credentials: "include",         // Important, without this we don't send the authorization cookies.
      method: "GET",
    }
  );

  const irisToUpdate = (await response.json())?.irisToUpdate ?? [];
  for (const iriToUpdate of irisToUpdate) {
    await requestLoadPackage(iriToUpdate, true);
  }

  gitOperationResultToast(response);
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


/**
 * Compares remote Git package with the package in DS and sets the is up to date flag based on if the packages is up to date with the Git Remote or not.
 */
export async function trySetPackageAsUpToDate(iri: string) {
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
      toast.success("Package marked as having NO uncommitted changes.");
    }
    else {
      toast.success("Package marked as having uncommitted changes.");
    }
  }
  else {
    toast.error("Unknown error when comparing package with the Git remote to check for changes.");
  }

  requestLoadPackage(iri, true);
  return response;
}