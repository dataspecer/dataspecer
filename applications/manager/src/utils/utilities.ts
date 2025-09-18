import { BranchAction, CreateNewBranchDialog } from "@/dialog/create-new-branch";
import { OpenBetterModal } from "@/lib/better-modal";
import { modifyPackageProjectData, modifyPackageRepresentsBranchHead, requestLoadPackage } from "@/package";
import { Package } from "@dataspecer/core-v2/project";
import { toast } from "sonner";

/**
 * TODO RadStr: Maybe not utility function, but can't think of better place now
 */
export async function removeGitLinkFromPackage(iri: string) {
  const removeFetchURL = import.meta.env.VITE_BACKEND + "/git/remove-git-repository?iri=" + encodeURIComponent(iri);
  const response = await fetch(
    removeFetchURL,
    {
      credentials: "include",         // TODO RadStr: Important, without this we don't send the authorization cookies.
      method: "GET",
    }
  );

  const irisToUpdate = (await response.json())?.irisToUpdate ?? [];
  for (const iriToUpdate of irisToUpdate) {
    await requestLoadPackage(iriToUpdate, true);
  }

  gitOperationResultToast(response);
}

// TODO RadStr: Maybe once again put elsewhere, since it is not really a utility function
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

export function gitOperationResultToast(response: Response) {
  if (response.ok) {
    toast.success("Git operation was successful");
  }
  else {
    toast.error("Git operation failed");
  }
}

// TODO RadStr: Just for debug
export async function debugClearMergeStateDBTable() {
  const response = await fetch(import.meta.env.VITE_BACKEND + "/git/debug-clear-merge-state-table", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
  });
  console.info("debugClearMergeStateDBTable response:", response);
}