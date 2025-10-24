import { BetterModalProps, OpenBetterModal, useBetterModal, } from "@/lib/better-modal";
import { useEffect, useState } from "react";
import { InfoIcon, Loader, X } from "lucide-react";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { MergeState } from "@dataspecer/git";
import { finalizeMergeState, removeMergeState } from "@/utils/merge-state-fetch-methods";
import { ShowMergeStateInfoDialog } from "./show-merge-state-info-dialog";

type MergeStateDialogProps = {
  iri: string,
} & BetterModalProps<null>;

export const ListMergeStatesDialog = ({ iri, isOpen, resolve }: MergeStateDialogProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mergeStates, setMergeStates] = useState<any[]>([]);
  const openModal = useBetterModal();


  useEffect(() => {
    setIsLoading(true);
    const fetchMergeStates = async () => {
      const response = await fetch(import.meta.env.VITE_BACKEND +
        "/git/get-merge-states?iri=" + iri +
        "&includeDiffData=false", {
        method: "GET",
      });

      const responseAsJSON = await response.json();
      setMergeStates(responseAsJSON);
      setIsLoading(false);
    };

    fetchMergeStates();
  }, []);

  const removeFromMergeStatesInDialog = (uuid: string) => {
    setMergeStates(prev => prev.filter(mergeState => uuid !== mergeState.uuid));
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="min-w-[650px]">
        <ModalHeader>
          <ModalTitle>List of currently opened merge states for chosen package</ModalTitle>
          <ModalDescription>
            Diff editor is opened on click
          </ModalDescription>
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" /> }
          {
          !isLoading && <>
            {/* The header */}
            <div className="grid grid-cols-2 divide-x divide-gray-300">
              <div className="flex items-center justify-center">Merge from</div>
              <div className="flex items-center justify-center">Merge to</div>
            </div>

            { mergeStates.map(mergeState => renderMergeState(mergeState, removeFromMergeStatesInDialog, openModal, resolve)) }
          </>
          }
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => resolve(null)}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const renderMergeState = (
  mergeState: MergeState,
  removeFromMergeStatesInDialog: (uuid: string) => void,
  openModal: OpenBetterModal,
  closeMergeStateList: (value: null) => void
) => {
  const removeMergeStateOnClickHandler = () => {
    removeFromMergeStatesInDialog(mergeState.uuid);
    removeMergeState(mergeState.uuid);
  };

  const finalizeMergeStateOnClick = async () => {
    const isSuccessfullyFinalized = await finalizeMergeState(mergeState.uuid);
    if (isSuccessfullyFinalized) {
      closeMergeStateList(null);
    }
  }

  return <div className={`flex items-baseline`}>
      {
        mergeState.conflictCount === 0 ?
        <button onClick={finalizeMergeStateOnClick}>Finalize</button> :
        <button>Can not finalize</button>
      }
      <button onClick={() => openModal(ShowMergeStateInfoDialog, {mergeState})} className="bg-blue-300 hover:bg-blue-500 relative top-[6px]"><InfoIcon/></button>
      <button className={`${mergeState.isUpToDate ? "" : "bg-red-400"} hover:bg-gray-300`}
              onClick={() => openModal(TextDiffEditorDialog, { initialMergeFromResourceIri: mergeState.rootIriMergeFrom, initialMergeToResourceIri: mergeState.rootIriMergeTo, editable: mergeState.editable}).finally(() => closeMergeStateList(null))}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex">
            <span className="text-base font-medium whitespace-nowrap truncate">{mergeState.rootIriMergeFrom}</span>
            <span className="text-xs text-gray-500 whitespace-nowrap pt-1">{mergeState.filesystemTypeMergeFrom}</span>
          </div>
          <div className="flex">
            <span className="text-base font-medium whitespace-nowrap truncate">{mergeState.rootIriMergeTo}</span>
            <span className="text-xs text-gray-500 whitespace-nowrap pt-1">{mergeState.filesystemTypeMergeTo}</span>
          </div>
        </div>
      </button>
      <button onClick={removeMergeStateOnClickHandler} className="bg-red-700 hover:bg-red-800 relative top-[6px]"><X/></button>
    </div>;
}
