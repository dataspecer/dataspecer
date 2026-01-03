import { DatastoreComparison, FinalizerVariantsForMergeOnFailure, FinalizerVariantsForPullOnFailure, FinalizerVariantsForPushOnFailure, MergeCommitType, MergeState } from "@dataspecer/git";

export const updateMergeState = async (
  fetchedMergeState: MergeState,
  conflictsToBeResolvedOnSave: DatastoreComparison[],
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

export const finalizePullMergeState = async (mergeStateUuid: string) => {
  try {
    const fetchResult = await fetch(
      `${import.meta.env.VITE_BACKEND}/git/finalize-pull-merge-state?uuid=${mergeStateUuid}`, {
        method: "POST",
      }
    );
    console.info("Finalize merge state response", fetchResult);   // TODO RadStr Debug:

    return fetchResult.status;
  }
  catch(error) {
    console.error(`Error when finalizing merge state (${mergeStateUuid}). The error: ${error}`);
    return null;
  }
}

export const finalizePullMergeStateOnFailure = async (
  mergeState: MergeState,
  finalizerVariant: FinalizerVariantsForPullOnFailure,
) => {
  const queryParams = "uuid=" + mergeState.uuid +
    "&rootIriToUpdate=" + mergeState.rootIriMergeFrom +
    "&pulledCommitHash=" + mergeState.lastCommitHashMergeTo +
    "&finalizerVariant=" + finalizerVariant;

  try {
    const fetchResult = await fetch(
      `${import.meta.env.VITE_BACKEND}/git/finalize-pull-merge-state-on-failure?${queryParams}`, {
        method: "POST",
      }
    );
    console.info("Finalize merge state response", fetchResult);   // TODO RadStr Debug:

    return fetchResult.ok;
  }
  catch(error) {
    console.error(`Error when finalizing merge state (${mergeState}). The error: ${error}`);
    return false;
  }
}


export const finalizePushMergeState = async (mergeStateUuid: string) => {
  try {
    const fetchResult = await fetch(
      `${import.meta.env.VITE_BACKEND}/git/finalize-push-merge-state?uuid=${mergeStateUuid}`, {
        method: "POST",
      }
    );
    console.info("Finalize merge state response", fetchResult);   // TODO RadStr Debug:

    return fetchResult.status;
  }
  catch(error) {
    console.error(`Error when finalizing merge state (${mergeStateUuid}). The error: ${error}`);
    return null;
  }
}

export const finalizePushMergeStateOnFailure = async (
  mergeStateUuid: string,
  finalizerVariant: FinalizerVariantsForPushOnFailure,
) => {
  const queryParams = "uuid=" + mergeStateUuid +
                      "&finalizerVariant=" + finalizerVariant;

  try {
    const fetchResult = await fetch(
      `${import.meta.env.VITE_BACKEND}/git/finalize-push-merge-state-on-failure?${queryParams}`, {
        method: "POST",
      }
    );
    console.info("Finalize merge state response", fetchResult);   // TODO RadStr Debug:

    return fetchResult.ok;
  }
  catch(error) {
    console.error(`Error when finalizing merge state (${mergeStateUuid}). The error: ${error}`);
    return false;
  }
}

export const finalizeMergeMergeState = async (mergeStateUuid: string, mergeCommitType: MergeCommitType) => {
  try {
    const fetchResult = await fetch(
      `${import.meta.env.VITE_BACKEND}/git/finalize-merge-merge-state?mergeStateUuid=${mergeStateUuid}&mergeCommitType=${mergeCommitType}`, {
        method: "POST",
      }
    );
    console.info("Finalize merge state response", fetchResult);   // TODO RadStr Debug:

    return fetchResult.status;
  }
  catch(error) {
    console.error(`Error when finalizing merge state (${mergeStateUuid}). The error: ${error}`);
    return null;
  }
}

export const finalizeMergeMergeStateOnFailure = async (
  mergeStateUuid: string,
  finalizerVariant: FinalizerVariantsForMergeOnFailure,
) => {
  const queryParams = "mergeStateUuid=" + mergeStateUuid +
    "&finalizerVariant=" + finalizerVariant;

  try {
    const fetchResult = await fetch(
      `${import.meta.env.VITE_BACKEND}/git/finalize-merge-merge-state-on-failure?${queryParams}`, {
        method: "POST",
      }
    );
    console.info("Finalize merge state response", fetchResult);   // TODO RadStr Debug:

    return fetchResult.ok;
  }
  catch(error) {
    console.error(`Error when finalizing merge state (${mergeStateUuid}). The error: ${error}`);
    return false;
  }
}

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
      }
    );
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
        method: "DELETE",
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
