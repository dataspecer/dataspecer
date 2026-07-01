import { BetterModalProps, useBetterModal, } from "@/lib/better-modal";
import { useEffect, useRef, useState } from "react";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { Loader } from "lucide-react";
import { EditableType, MergeState } from "@dataspecer/git";
import { requestLoadPackage } from "@/package";
import { removeMergeState } from "@/utils/merge-state-backend-requests";
import { MergeActor } from "@/hooks/use-merge-actors";
import { useTranslation } from "react-i18next";
import { createTranslationForWaitTime, CREATE_MERGE_STATE_WAIT_TIME } from "@/utils/git-wait-times";


/**
 * Simply fetches merge state.
 * @param shouldIncludeDiffData if true returns the full diff tree. Otherwise just the metadata.
 * @param shouldForceDiffTreeReload Forces the diff tree to recompute again. Otherwise it is recomputed only if there are changes
 *  (it is not up to date, that is it was modified from somewhere else than a diff editor)
 */
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
    const fetchResultAsJson = await fetchResult.json();
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
    const fetchResultAsJson = await fetchResult.json();
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
 * @todo Note that now it issues the mergeFrom, mergeTo iris to find the resource on the backend. We can afford that since,
 *  the IRIs are paths to the root resources of the merge states. But if we decide in future to make the merge state "static".
 *  Then the merge from resource will be stored in Git and its path will not be IRI, so the searching for the merge state would have to be properly handled.
 */
export const CreateMergeStateCausedByMergeDialog = ({ mergeFrom, mergeTo, editable, isOpen, resolve }: OpenMergeStateProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alreadyExisted, setAlreadyExisted] = useState<boolean>(false);
  const [mergeState, setMergeState] = useState<MergeState | null>(null);
  const [mergeStateCreationFailure, setMergeStateCreatingFailure] = useState<boolean>(false);
  const [mergeStateIdInCaseOfNoConflicts, setMergeStateIdInCaseOfNoConflicts] = useState<string | null>(null);
  const openModal = useBetterModal();
  const { t } = useTranslation();
  const [showingNonBranchWarning, setShowingNonBranchWarning] = useState<boolean>(false);

  const [secondsPassed, setSecondsPassed] = useState<number>(0);
  const [secondsPassedStartTime, setSecondsPassedStartTime] = useState<number>(0);

  // Once again for strict mode. Otherwise, the dialog closes because it finds out that the merge state was already created.
  const didRun = useRef<boolean>(false);

  useEffect(() => {
    // Can't find better type
    const interval: any = setInterval(() => {
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
      setIsLoading(false);
    }
    else {
      resolve(null);
      openModal(
        TextDiffEditorDialog,
        {
          initialMergeFromRootMetaPath: mergeFrom.iri,
          initialMergeToRootMetaPath: mergeTo.iri,
          editable: editable,
        }
      );
    }
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
    let newlyCreatedWithNoConflicts: boolean = false;
    if (fetchedMergeState === null) {
      const createdMergeState = await createMergeStateOnBackend(mergeFrom.iri, mergeTo.iri);
      await requestLoadPackage(mergeFrom.iri, true);
      await requestLoadPackage(mergeTo.iri, true);
      fetchedMergeState = createdMergeState.mergeState;
      if (createdMergeState.error !== null) {
        alreadyExists = false;
        if (createdMergeState.error.includes("Unique constraint failed on the fields")) {   // This is because of strict mode - since it may have been created by the first run. Therefore, we just resolve it.
          fetchedMergeState = await fetchMergeState(mergeFrom.iri, mergeTo.iri, false, true, false);
          if (fetchedMergeState !== null && fetchedMergeState?.conflictCount === 0) {
            setMergeStateIdInCaseOfNoConflicts(createdMergeState.mergeStateId);
          }
          alreadyExists = true;
        }
        if (fetchedMergeState === null) {   // If we failed for different reason
          setMergeStateCreatingFailure(true);
        }
      }
      else if (createdMergeState.mergeState === null) {
        setMergeStateIdInCaseOfNoConflicts(createdMergeState.mergeStateId);
        newlyCreatedWithNoConflicts = true;
        alreadyExists = false;
      }
      else {
        alreadyExists = false;
      }
    }
    else {
      alreadyExists = true;
    }
    if (!newlyCreatedWithNoConflicts && (fetchedMergeState?.rootFullPathToMetaMergeFrom !== mergeFrom.iri || fetchedMergeState.rootFullPathToMetaMergeTo !== mergeTo.iri)) {
      console.error({rootFullPathToMetaMergeFrom: fetchedMergeState?.rootFullPathToMetaMergeFrom, mergeFromIri: mergeFrom.iri,
        rootFullPathToMetaMergeTo: fetchedMergeState?.rootFullPathToMetaMergeTo, mergeToIri: mergeTo.iri, fetchedMergeState});
      throw new Error("Not equal iri to path when merging");
    }
    setMergeState(fetchedMergeState);
    setAlreadyExisted(alreadyExists);
    setIsLoading(false);
  }

  useEffect(() => {
    if (mergeFrom.isBranch && mergeTo.isBranch && !didRun.current) {
      didRun.current = true;
      initialLoad();
    }
    return () => {
      didRun.current = true;
    };
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
              <ModalTitle>{t("git.merge-state-dialog.warning.non-branch.title")}</ModalTitle>
              <ModalDescription>
                <span>{t("git.merge-state-dialog.warning.non-branch.description.line-one")}</span>
                <br/>
                <span>{t("git.merge-state-dialog.warning.non-branch.description.line-two")}</span>
              </ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <Button title={t("git.merge-state-dialog.warning.non-branch.close-button-title")} variant="outline" onClick={() => resolve(null)}>{t("git.merge-state-dialog.warning.non-branch.close-button")}</Button>
              <Button title={t("git.merge-state-dialog.warning.non-branch.create-button-title")} variant="default" onClick={createMergeStateHandler}>{t("git.merge-state-dialog.warning.non-branch.create-button")}</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>);
    }
    else {
      return (
        <Modal open={isOpen} onClose={() => resolve(null)}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>{t("git.merge-state-dialog.warning.from-non-branch.title")}</ModalTitle>
              <ModalDescription>{t("git.merge-state-dialog.warning.from-non-branch.description")}</ModalDescription>
            </ModalHeader>
            <ModalFooter>
              <Button title={t("git.merge-state-dialog.warning.non-branch.close-button-title")} variant="outline" onClick={() => resolve(null)}>{t("git.merge-state-dialog.warning.non-branch.close-button")}</Button>
              <Button title={t("git.merge-state-dialog.warning.from-non-branch.create-button-title")} variant="default" onClick={createMergeStateHandler}>{t("git.merge-state-dialog.warning.non-branch.create-button")}</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>);
    }
  }

  if (mergeStateIdInCaseOfNoConflicts !== null && !alreadyExisted) {
    return (
      <Modal open={isOpen} onClose={() => resolve(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle className="p-1">{t("git.merge-state-dialog.created.no-conflicts.title")}</ModalTitle>
          </ModalHeader>
          <ModalFooter>
            <Button title={t("git.merge-state-dialog.created.close-button-title")} variant="outline" onClick={() => resolve(null)}>{t("git.merge-state-dialog.created.close-button")}</Button>
            <Button title={t("git.merge-state-dialog.created.preview-button-title")} variant="default" onClick={openDiffEditorPreviewNoConflicts}>{t("git.merge-state-dialog.created.preview-button")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>);
  }
  else if (mergeStateIdInCaseOfNoConflicts === null && mergeState !== null && !alreadyExisted) {
    // Basically copy paste of the if, just changing one word ... so it can be refactored
    return (
      <Modal open={isOpen} onClose={() => resolve(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle className="p-1">{t("git.merge-state-dialog.created.with-conflicts.title")}</ModalTitle>
          </ModalHeader>
          <ModalFooter>
            <Button title={t("git.merge-state-dialog.created.close-button-title")} variant="outline" onClick={() => resolve(null)}>{t("git.merge-state-dialog.created.close-button")}</Button>
            <Button title={t("git.merge-state-dialog.created.preview-button-title")} variant="default" onClick={openDiffEditorPreviewNoConflicts}>{t("git.merge-state-dialog.created.preview-button")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>);
  }


  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("git.merge-state-dialog.title")}</ModalTitle>
          <ModalDescription>
          {(alreadyExisted || !isLoading) ?
            null :
            <div className="flex flex-col">
              <p>{t("git.merge-state-dialog.status.creating.title")}</p>
              <p>{createTranslationForWaitTime(t, CREATE_MERGE_STATE_WAIT_TIME)}</p>
              <div className="flex">
                <Loader className="mr-2 mt-1 h-4 w-4 animate-spin" />
                {t("git.merge-state-dialog.status.seconds-passed", { seconds: secondsPassed - secondsPassedStartTime })}
              </div>
            </div>
          }
          {
            (!(alreadyExisted && isLoading)) ?
              null :
              <div className="flex flex-col">
                <p>{t("git.merge-state-dialog.status.replacing.title")}</p>
                <p>{createTranslationForWaitTime(t, CREATE_MERGE_STATE_WAIT_TIME)}</p>
                <div className="flex">
                  <Loader className="mr-2 mt-1 h-4 w-4 animate-spin" />
                  {t("git.merge-state-dialog.status.seconds-passed", { seconds: secondsPassed - secondsPassedStartTime })}
                </div>
              </div>
          }
          </ModalDescription>
        </ModalHeader>
        { mergeStateCreationFailure ? t("git.merge-state-dialog.error.fetch-failure") : null }
        { !isLoading && !mergeStateCreationFailure && alreadyExisted ?
          <div>
            {t("git.merge-state-dialog.already-exists")}
          </div> :
          null
        }
        { mergeStateCreationFailure ??
          <ModalFooter>
            <Button variant="outline" onClick={() => resolve(null)}>{t("close")}</Button>
          </ModalFooter>
        }
        {
        (!isLoading && !mergeStateCreationFailure && alreadyExisted) &&
          <ModalFooter>
            <Button variant="outline" onClick={() => resolve(null)}>{t("git.merge-state-dialog.button.leave")}</Button>
            <Button variant="destructive" onClick={handleReplaceExisting}>{t("git.merge-state-dialog.button.replace")}</Button>
            <Button variant="default" onClick={handleKeepExisting}>{t("git.merge-state-dialog.button.keep-old")}</Button>
          </ModalFooter>
        }
      </ModalContent>
    </Modal>
  );
}
