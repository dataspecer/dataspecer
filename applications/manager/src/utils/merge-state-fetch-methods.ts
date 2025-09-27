import { ComparisonData, MergeState } from "@dataspecer/git";

export const saveMergeState = async (
  fetchedMergeState: MergeState,
  conflictsToBeResolvedOnSave: ComparisonData[],
) => {
  try {
    const pathsForConflictsToBeResolvedOnSave = conflictsToBeResolvedOnSave.map(conflict => conflict.affectedDataStore.fullPath);

    const fetchResult = await fetch(
      `${import.meta.env.VITE_BACKEND}/git/update-merge-state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid: fetchedMergeState.uuid,
          currentlyUnresolvedConflicts: fetchedMergeState.unresolvedConflicts
            ?.filter(unresolvedConflict => !pathsForConflictsToBeResolvedOnSave.includes(unresolvedConflict.affectedDataStore.fullPath))
            .map(conflict => conflict.affectedDataStore.fullPath),
        }),
      });

    console.info("update merge state response", fetchResult);   // TODO RadStr Debug:

    return fetchResult;
  }
  catch(error) {
    console.error(`Error when updating merge state (${fetchedMergeState}). The error: ${error}`);
    throw error;
  }
};

export const finalizeMergeState = async (mergeStateUUID: string | undefined): Promise<boolean> => {
  if (mergeStateUUID === undefined) {
    // I think that it should be error
    console.error("Error when finalizing merge state, there is actually no merge state");
    return false;
  }

  try {
    const fetchResult = await fetch(
      `${import.meta.env.VITE_BACKEND}/git/finalize-merge-state?uuid=${mergeStateUUID}`, {
        method: "POST",
      });
    console.info("Finalize merge state response", fetchResult);   // TODO RadStr Debug:

    return fetchResult.ok;
  }
  catch(error) {
    console.error(`Error when finalizing merge state (${mergeStateUUID}). The error: ${error}`);
    return false;
  }
}

export const removeMergeState = async (mergeStateUUID: string | undefined): Promise<boolean> => {
  if (mergeStateUUID === undefined) {
    // I think that it should be error
    console.error("Error when removing merge state, there is actually no merge state");
    return false;
  }

  try {
    const fetchResult = await fetch(
      `${import.meta.env.VITE_BACKEND}/git/remove-merge-state?uuid=${mergeStateUUID}`, {
        method: "POST",
      });
    console.info("Removed merge state response", fetchResult);   // TODO RadStr Debug:

    return fetchResult.ok;
  }
  catch(error) {
    console.error(`Error when removing merge state (${mergeStateUUID}). The error: ${error}`);
    return false;
  }
}

/**
 * @todo TODO RadStr: Just for debug
 */
export async function debugClearMergeStateDBTable() {
  const response = await fetch(import.meta.env.VITE_BACKEND + "/git/debug-clear-merge-state-table", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
  });
  console.info("debugClearMergeStateDBTable response:", response);
}

/**
 * @todo TODO RadStr: Just for debug
 */
export async function debugClearMergeFromDataFromResource(iri: string) {
  const response = await fetch(import.meta.env.VITE_BACKEND + "/git/debug-clear-merge-from-data-from-resource?iri=" + iri, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
  });
  console.info("debugClearMergeStateDBTable response:", response);
}