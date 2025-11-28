import { BetterModalProps, OpenBetterModal, useBetterModal, } from "@/lib/better-modal";
import { useEffect, useState } from "react";
import { InfoIcon, Loader, X } from "lucide-react";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { getHumanReadableFilesystemName, MergeState } from "@dataspecer/git";
import { removeMergeState } from "@/utils/merge-state-backend-requests";
import { ShowMergeStateInfoDialog } from "./show-merge-state-info-dialog";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { requestLoadPackage } from "@/package";

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
          <ModalTitle>List of currently opened merge states for chosen data specification</ModalTitle>
          <ModalDescription>
            Diff editor is opened on click
          </ModalDescription>
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" /> }
          {
          !isLoading && <>
            {/* The header */}
            {/* The ml-4 is here for the first button, otherwise the merge state cause in the rows is shifted */}
            <div className="grid grid-cols-[1fr_2fr_2fr] divide-x divide-gray-300 ml-4">
              <div className="flex items-center justify-center">Cause</div>
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
  const removeMergeStateOnClickHandler = async () => {
    removeFromMergeStatesInDialog(mergeState.uuid);
    await removeMergeState(mergeState.uuid);
    await requestLoadPackage(mergeState.rootIriMergeFrom, true);
    await requestLoadPackage(mergeState.rootIriMergeTo, true);
  };


  return <div className={`flex items-baseline`}>
      <button onClick={() => openModal(ShowMergeStateInfoDialog, {mergeState})} className="bg-blue-300 hover:bg-blue-500 relative top-[6px]"><InfoIcon/></button>
      <button className={`w-full ${mergeState.isUpToDate ? "" : "bg-red-400"} hover:bg-gray-300`}
              onClick={() => openModal(TextDiffEditorDialog, { initialMergeFromResourceIri: mergeState.rootIriMergeFrom, initialMergeToResourceIri: mergeState.rootIriMergeTo, editable: mergeState.editable}).finally(() => closeMergeStateList(null))}>
                {/* TODO RadStr: Just debug */}
              {/* onClick={() => openModal(MergeStateFinalizerDialog, {mergeState, openModal}).finally(() => closeMergeStateList(null))}> */}
        {createMergeStateRowText(mergeState)}
      </button>
      <button onClick={removeMergeStateOnClickHandler} className="bg-red-500 hover:bg-red-600 relative top-[6px]"><X/></button>
    </div>;
}


function createMergeStateRowText(mergeState: MergeState) {
  return <div className="grid grid-cols-[1fr_2fr_2fr] justify-center items-center gap-4">
      <span className="flex text-base font-medium whitespace-nowrap justify-center items-center truncate">{mergeState.mergeStateCause}</span>
      <div className="flex justify-center items-center truncate">
        {createMergeStateSourceText(mergeState, "MergeFrom")}
      </div>
      <div className="flex justify-center items-center truncate">
        {createMergeStateSourceText(mergeState, "MergeTo")}
      </div>
    </div>;
}

function createMergeStateSourceText(mergeState: MergeState, side: "MergeFrom" | "MergeTo") {
  return <>
      <span className="text-base font-medium whitespace-nowrap truncate">{mergeState[`branch${side}`]}</span>
      <span className="text-xs text-gray-500 whitespace-nowrap pl-1 pt-1">{getHumanReadableFilesystemName(mergeState[`filesystemType${side}`])}</span>
    </>;
// TODO RadStr: Don't know if this split is better than jsut putting branch everywhere
  // if (mergeState.mergeStateCause === "merge") {
  //   return <>
  //       <span className="text-base font-medium whitespace-nowrap truncate">{mergeState[`branch${side}`]}</span>
  //       <span className="text-xs text-gray-500 whitespace-nowrap pl-1 pt-1">{getHumanReadableFilesystemName(mergeState[`filesystemType${side}`])}</span>
  //     </>;
  // }
  // else {
  //   return <>
  //       <span className="text-base font-medium whitespace-nowrap truncate">{mergeState[`lastCommitHash${side}`]}</span>
  //       <span className="text-xs text-gray-500 whitespace-nowrap pl-1 pt-1">{getHumanReadableFilesystemName(mergeState[`filesystemType${side}`])}</span>
  //     </>;
  // }
}