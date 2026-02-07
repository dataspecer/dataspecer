import { BetterModalProps, useBetterModal, } from "@/lib/better-modal";
import { useEffect, useState } from "react";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { Loader } from "lucide-react";
import { EditableType, MergeState } from "@dataspecer/git";
import { requestLoadPackage } from "@/package";
import { removeMergeState } from "@/utils/merge-state-backend-requests";
import { MergeActor } from "@/hooks/use-merge";


export async function fetchMergeState(
  rootPathMergeFrom: string,
  rootPathMergeTo: string,
  shouldPrintMissingStateToConsole: boolean,
  shouldIncludeDiffData: boolean,
  shouldForceDiffTreeReload: boolean,
): Promise<MergeState | null> {
  try {
    const queryParams = `rootPathMergeFrom=${rootPathMergeFrom}&rootPathMergeTo=${rootPathMergeTo}&includeDiffData=${shouldIncludeDiffData}&shouldForceDiffTreeReload=${shouldForceDiffTreeReload}`;
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
    console.error(`Error when fetching merge state (for iris: ${rootPathMergeFrom} and ${rootPathMergeTo}). The error: ${error}`);
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
  mergeFrom: NonNullable<MergeActor>,
  mergeTo: NonNullable<MergeActor>,
  editable: EditableType,
} & BetterModalProps<null>;



/**
 * Dialog to handle creating merge state between 2 DS packages.
 * Gets 2 DS packages - mergeFrom and mergeTo.
 * If the merge state does not exists between them, then it creates one.
 * The diff editor is opened right after.
 */
export const CreateMergeStateCausedByMergeDialog = ({ mergeFrom, mergeTo, editable, isOpen, resolve }: OpenMergeStateProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alreadyExisted, setAlreadyExisted] = useState<boolean>(false);
  const [mergeState, setMergeState] = useState<MergeState | null>(null);
  const [mergeStateCreationFailure, setMergeStateCreatingFailure] = useState<boolean>(false);
  const [mergeStateIdInCaseOfNoConflicts, setMergeStateIdInCaseOfNoConflicts] = useState<string | null>(null);
  const openModal = useBetterModal();
  const [showingNonBranchWarning, setShowingNonBranchWarning] = useState<boolean>(false);

  const [secondsPassed, setSecondsPassed] = useState<number>(0);
  const [secondsPassedStartTime, setSecondsPassedStartTime] = useState<number>(0);

  useEffect(() => {
    const interval: NodeJS.Timeout | null = setInterval(() => {
      setSecondsPassed(prev => prev + 1);
    }, 1000);

    if (!mergeFrom.isBranch || !mergeTo.isBranch) {
      setShowingNonBranchWarning(true);
    }

    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, []);

  const handleReplaceExisting = async () => {
    setSecondsPassedStartTime(secondsPassed);
    setIsLoading(true);
    await removeMergeState(mergeState?.uuid);
    // Note that here we can use the iris, since both the packages exist in DS, therefore their path === their IRI.
    const createdMergeState = await createMergeStateOnBackend(mergeFrom.iri, mergeTo.iri);
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
          initialMergeFromRootMetaPath: createdMergeState.mergeState.rootFullPathToMetaMergeFrom,
          initialMergeToRootMetaPath: createdMergeState.mergeState.rootFullPathToMetaMergeTo,
          editable: editable,
        }
      );
    }
    setIsLoading(false);
  }

  const handleKeepExisting = async () => {
    resolve(null);
    openModal(
      TextDiffEditorDialog,
      {
        initialMergeFromRootMetaPath: mergeState!.rootFullPathToMetaMergeFrom,
        initialMergeToRootMetaPath: mergeState!.rootFullPathToMetaMergeTo,
        editable: editable,
      }
    );
  }

  const initialLoad = async () => {
    setIsLoading(true);
    let fetchedMergeState = await fetchMergeState(mergeFrom.iri, mergeTo.iri, false, true, false);
    let alreadyExists: boolean;
    let isMergeStateCreated = true;
    if (fetchedMergeState === null) {
      const createdMergeState = await createMergeStateOnBackend(mergeFrom.iri, mergeTo.iri);
      await requestLoadPackage(mergeFrom.iri, true);
      await requestLoadPackage(mergeTo.iri, true);
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
    if (fetchedMergeState?.rootFullPathToMetaMergeFrom !== mergeFrom.iri || fetchedMergeState.rootFullPathToMetaMergeTo !== mergeTo.iri) {        // TODO RadStr Debug: Debug if to check that my assert about development is true
      alert("Not equal iri to path when merging");
      throw new Error("Not equal iri to path when merging");
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
            initialMergeFromRootMetaPath: fetchedMergeState!.rootFullPathToMetaMergeFrom,
            initialMergeToRootMetaPath: fetchedMergeState!.rootFullPathToMetaMergeTo,
            editable: editable,
          }
        );
      }
    }
  }

  useEffect(() => {
    if (mergeFrom.isBranch && mergeTo.isBranch) {
      initialLoad();
    }
  }, []);

  const openDiffEditorPreviewNoConflicts = async () => {
    resolve(null);
    openModal(TextDiffEditorDialog, { initialMergeFromRootMetaPath: mergeFrom.iri, initialMergeToRootMetaPath: mergeTo.iri, editable: editable}).finally(() => resolve(null))
  }

  if (showingNonBranchWarning) {
    const createMergeStateHandler = () => {
      setShowingNonBranchWarning(false);
      setSecondsPassedStartTime(secondsPassed);
      initialLoad();
    }

    if (!mergeTo.isBranch) {
      return (
        <Modal open={isOpen} onClose={() => resolve(null)}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>⚠️Merging into non-branch.</ModalTitle>
              <ModalDescription>You can not perform any Git action after finishing.<br/>This is only useful if you want to move data from one package to another within Dataspecer.</ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <Button title="Creates the merge state, user can do normal actions, but when finalizing nothing happens and the state is removed" variant="outline" onClick={createMergeStateHandler}>Create merge state</Button>
              <Button title="Closes the dialog" variant="outline" onClick={() => resolve(null)}>Close dialog</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>);
    }
    else {
      return (
        <Modal open={isOpen} onClose={() => resolve(null)}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>⚠️Merging from non-branch into branch</ModalTitle>
              <ModalDescription>This kind of merge state can be finalized only through rebase commit.</ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <Button title="Creates the merge state. Finalizing through merge commit is not available, only the rebase commit." variant="outline" onClick={createMergeStateHandler}>Create merge state</Button>
              <Button title="Closes the dialog." variant="outline" onClick={() => resolve(null)}>Close dialog</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>);
    }
  }

  if (mergeStateIdInCaseOfNoConflicts !== null) {
    return (
      <Modal open={isOpen} onClose={() => resolve(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Created merge state for DS packages and there were no conflicts.</ModalTitle>
          </ModalHeader>
          <ModalFooter>
            <Button title="Opens the diff editor with the preview of the merge commit. Finalize the merging inside the editor." variant="outline" onClick={openDiffEditorPreviewNoConflicts}>Open diff editor preview</Button>
            <Button title="Closes the dialog. Note that the merge state still exists. You can resolve it later" variant="outline" onClick={() => resolve(null)}>Close dialog</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>);
  }

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Create merge state between Dataspecer packages</ModalTitle>
          <ModalDescription>
          {(alreadyExisted || !isLoading) ?
            null :
            <div className="flex flex-col">
              <p>Merge state did not exist. Creating a new one.</p>
              <p>Usually takes around 5-10 seconds.</p>
              <div className="flex">
                <Loader className="mr-2 mt-1 h-4 w-4 animate-spin" />
                {`${secondsPassed - secondsPassedStartTime} seconds passed`}
              </div>
            </div>
          }
          {
            (!(alreadyExisted && isLoading)) ?
              null :
              <div className="flex flex-col">
                <p>Replacing merge state.</p>
                <p>Usually takes around 5-10 seconds.</p>
                <div className="flex">
                  <Loader className="mr-2 mt-1 h-4 w-4 animate-spin" />
                  {`${secondsPassed - secondsPassedStartTime} seconds passed`}
                </div>
              </div>
          }
          </ModalDescription>
        </ModalHeader>
        { mergeStateCreationFailure ? "There was some failure when fetching/creating merge state, check console for more info." : null }
        { !isLoading && !mergeStateCreationFailure && <div>Root iri merge from: {mergeState?.rootIriMergeFrom}</div> }
        { !isLoading && !mergeStateCreationFailure && alreadyExisted ?
          <div>
            The merge state already exists. Do you wish to replace it with new one?
          </div> :
          null
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
