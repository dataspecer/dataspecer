import { BetterModalProps, useBetterModal, } from "@/lib/better-modal";
import { useEffect, useState } from "react";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { Loader } from "lucide-react";
import { EditableType, MergeState } from "@dataspecer/git";
import { finalizeMergeState, removeMergeState } from "@/utils/merge-state-fetch-methods";

export async function fetchMergeState(rootIriMergeFrom: string, rootIriMergeTo: string, shouldPrintMissingStateToConsole: boolean,): Promise<MergeState | null> {
  try {
    const queryParams = `rootIriMergeFrom=${rootIriMergeFrom}&rootIriMergeTo=${rootIriMergeTo}&includeDiffData=true`;
    const fetchResult = await fetch(`${import.meta.env.VITE_BACKEND}/git/get-merge-state?${queryParams}`, {
      method: "GET",
    });
    console.info("fetched data", fetchResult);   // TODO RadStr Debug:
    const fetchResultAsJson = await fetchResult.json();
    console.info("fetched data as json", fetchResultAsJson);   // TODO RadStr Debug:
    if (fetchResultAsJson?.error !== undefined) {
      if (shouldPrintMissingStateToConsole) {
        console.error(fetchResultAsJson.error);
      }
      return null;
    }

    return fetchResultAsJson;
  }
  catch(error) {
    console.error(`Error when fetching merge state (for iris: ${rootIriMergeFrom} and ${rootIriMergeTo}). The error: ${error}`);
    throw error;
  }
}


export async function createMergeStateOnBackend(
  rootIriMergeFrom: string,
  rootIriMergeTo: string
): Promise<{mergeState: MergeState | null, mergeStateId: string | null, error: string | null}> {
  try {
    const queryParams = `mergeFromIri=${rootIriMergeFrom}&mergeToIri=${rootIriMergeTo}`;
    const fetchResult = await fetch(`${import.meta.env.VITE_BACKEND}/git/create-merge-state-between-ds-packages?${queryParams}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    console.info("fetched data for create merge state", fetchResult);   // TODO RadStr Debug:
    const fetchResultAsJson = await fetchResult.json();
    console.info("fetched data for create merge state as json", fetchResultAsJson);   // TODO RadStr Debug:
    if (fetchResultAsJson.error !== undefined) {
      console.error(fetchResultAsJson.error);
      return {
        mergeState: null,
        mergeStateId: null,
        error: fetchResultAsJson.error,
      };
    }
    else if (fetchResultAsJson.noConflicts !== undefined) {
      return {
        mergeState: null,
        mergeStateId: fetchResultAsJson.mergeStateId,
        error: null,
      };
    }
    else {
      return {
        mergeState: fetchResultAsJson,
        mergeStateId: fetchResultAsJson.uuid,
        error: null,
      };

    }
  }
  catch(error) {
    console.error(`Error when creating merge state (for iris: ${rootIriMergeFrom} and ${rootIriMergeTo}). The error: ${error}`);
    throw error;
  }
}


type OpenMergeStateProps = {
  mergeFrom: string,
  mergeTo: string,
  editable: EditableType,
} & BetterModalProps<null>;



/**
 * Dialog to handle creating merge state between 2 DS packages.
 * Gets 2 DS packages - mergeFrom and mergeTo.
 * If the merge state does not exists between them, then it creates one.
 * The diff editor is opened right after.
 */
export const OpenMergeState = ({ mergeFrom, mergeTo, editable, isOpen, resolve }: OpenMergeStateProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alreadyExisted, setAlreadyExisted] = useState<boolean>(false);
  const [mergeState, setMergeState] = useState<MergeState | null>(null);
  const [mergeStateCreationFailure, setMergeStateCreatingFailure] = useState<boolean>(false);
  const [mergeStateIdInCaseOfNoConflicts, setMergeStateIdInCaseOfNoConflicts] = useState<string | null>(null);
  const openModal = useBetterModal();

  const handleReplaceExisting = async () => {
    const createdMergeState = await createMergeStateOnBackend(mergeFrom, mergeTo);
    setMergeState(createdMergeState.mergeState);
    if (createdMergeState.error !== null) {
      setMergeStateCreatingFailure(true);
    }
    else if (createdMergeState.mergeState === null) {
      setMergeStateIdInCaseOfNoConflicts(createdMergeState.mergeStateId);
    }
    else {
      resolve(null);
      openModal(
        TextDiffEditorDialog,
        {
          initialMergeFromResourceIri: createdMergeState.mergeState.rootIriMergeFrom,
          initialMergeToResourceIri: createdMergeState.mergeState.rootIriMergeTo,
          editable: editable,
        }
      );
    }
  }

  const handleKeepExisting = async () => {
    openModal(
      TextDiffEditorDialog,
      {
        initialMergeFromResourceIri: mergeState!.rootIriMergeFrom,
        initialMergeToResourceIri: mergeState!.rootIriMergeTo,
        editable: editable,
      }
    );
  }


  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      let fetchedMergeState = await fetchMergeState(mergeFrom, mergeTo, false);
      let alreadyExists: boolean;
      let isMergeStateCreated = true;
      if (fetchedMergeState === null) {
        const createdMergeState = await createMergeStateOnBackend(mergeFrom, mergeTo);
        fetchedMergeState = createdMergeState.mergeState;
        if (createdMergeState.error !== null) {
          setMergeStateCreatingFailure(true);
          isMergeStateCreated = false;
        }
        else if (createdMergeState.mergeState === null) {
          setMergeStateIdInCaseOfNoConflicts(createdMergeState.mergeStateId);
          isMergeStateCreated = false;
        }
        alreadyExists = false;
      }
      else {
        alreadyExists = true;
      }
      setMergeState(fetchedMergeState);
      console.info({fetchedMergeState, editable});    // TODO RadStr Debug:
      setAlreadyExisted(alreadyExists);
      setIsLoading(false);
      if (isMergeStateCreated) {
        if (!alreadyExists) {
          resolve(null);
          openModal(
            TextDiffEditorDialog,
            {
              initialMergeFromResourceIri: fetchedMergeState!.rootIriMergeFrom,
              initialMergeToResourceIri: fetchedMergeState!.rootIriMergeTo,
              editable: editable,
            }
          );
        }
      }
    }

    initialLoad();
  }, []);

  const closeNoConflictsAndNoAction = () => {
    // Should be always defined
    removeMergeState(mergeStateIdInCaseOfNoConflicts ?? undefined);
    resolve(null);
  }

  const closeNoConflictsAndFinalize = () => {
    // Should be always defined
    finalizeMergeState(mergeStateIdInCaseOfNoConflicts ?? undefined);
    resolve(null);
  }

  if (mergeStateIdInCaseOfNoConflicts !== null) {
    return (
      <Modal open={isOpen} onClose={closeNoConflictsAndNoAction}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Created merge state for DS packages and there were no conflicts. Do you want to finish merging?</ModalTitle>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={closeNoConflictsAndFinalize}>Yes</Button>
            <Button title="Removes the merge state on leave" variant="outline" onClick={closeNoConflictsAndNoAction}>No</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>);
  }

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Perform merge on DS packages</ModalTitle>
          <ModalDescription>
            Tries to perform merge from one DS package to another. In case of conflicts creates new merge state, which needs to be resolved
          </ModalDescription>
        </ModalHeader>
        { isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null }
        { mergeStateCreationFailure ? "There was some failure when fetching/creating merge state, check console for more info." : null }
        { !isLoading && !mergeStateCreationFailure && <div>Root iri merge from: {mergeState?.rootIriMergeFrom}</div> }
        { !isLoading && !mergeStateCreationFailure && alreadyExisted ?
          <div>
            The merge state already exists, do you wish to replace it with new one?
          </div> :
          <div>
            Merge state did not exist, created new one
          </div>
        }
        { mergeStateCreationFailure ??
          <ModalFooter>
            <Button variant="outline" onClick={() => resolve(null)}>Close</Button>
          </ModalFooter>
        }
        {
        (!isLoading && !mergeStateCreationFailure && alreadyExisted) &&
          <ModalFooter>
            <Button variant="outline" onClick={() => resolve(null)}>Leave</Button>
            <Button variant="outline" onClick={handleReplaceExisting}>Replace</Button>
            <Button variant="outline" onClick={handleKeepExisting}>Keep old</Button>
          </ModalFooter>
        }
      </ModalContent>
    </Modal>
  );
}
