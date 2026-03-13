import { BetterModalProps, OpenBetterModal, useBetterModal, } from "@/lib/better-modal";
import { useEffect, useState } from "react";
import { BookOpenTextIcon, InfoIcon, Loader, Trash2 } from "lucide-react";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { getHumanReadableFilesystemName, MergeState } from "@dataspecer/git";
import { removeMergeState } from "@/utils/merge-state-backend-requests";
import { ShowMergeStateInfoDialog } from "./show-merge-state-info-dialog";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { requestLoadPackage } from "@/package";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";

type MergeStateDialogProps = {
  iri: string,
} & BetterModalProps<null>;

export const ListMergeStatesDialog = ({ iri, isOpen, resolve }: MergeStateDialogProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mergeStates, setMergeStates] = useState<any[]>([]);
  const openModal = useBetterModal();
  const [isInfoDialogShown, setIsInfoDialogShown] = useState<boolean>(false);


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
    <Modal open={!isInfoDialogShown && isOpen} onClose={() => resolve(null)}>
      <ModalContent className="md:min-w-[1200px] overflow-x-auto">
        <ModalHeader>
          <ModalTitle>List of currently opened merge states for chosen data specification</ModalTitle>
          <ModalDescription>
            <p className="flex flex-1 flex-row">Diff editor is opened on click<PopOverGitGeneralComponent><MergeStateListTooltip/></PopOverGitGeneralComponent></p>
          </ModalDescription>
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" /> }
          {
          !isLoading && <>
            {/* The header */}
            {/* The ml-4 is here for the first button, otherwise the merge state cause in the rows is shifted */}
            <div className="grid grid-cols-[91%_9%] mr-12">
              <div className="grid grid-cols-[2fr_2fr_1fr_2.1fr_2.1fr] divide-x divide-gray-300 min-w-[1000px] max-lg:min-w-[1000px]">
                <div className="flex items-center justify-center">Created at</div>
                <div className="flex items-center justify-center">Last modified at</div>
                <div className="flex items-center justify-center">Cause</div>
                <div className="flex items-center justify-center">Merge from</div>
                <div className="flex items-center justify-center">Merge to</div>
              </div>
            </div>

            { mergeStates.map(mergeState => renderMergeState(mergeState, removeFromMergeStatesInDialog, setIsInfoDialogShown, openModal, resolve)) }
          </>
          }
        </ModalHeader>
        <ModalFooter className="pt-8">
          <Button variant="outline" onClick={() => resolve(null)}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const renderMergeState = (
  mergeState: MergeState,
  removeFromMergeStatesInDialog: (uuid: string) => void,
  setIsInfoDialogShown: (isShown: boolean) => void,
  openModal: OpenBetterModal,
  closeMergeStateListDialog: (value: null) => void
) => {
  const removeMergeStateOnClickHandler = async () => {
    removeFromMergeStatesInDialog(mergeState.uuid);
    await removeMergeState(mergeState.uuid);
    await requestLoadPackage(mergeState.rootIriMergeFrom, true);
    await requestLoadPackage(mergeState.rootIriMergeTo, true);
  };

  const openDiffEditor = () => {
    closeMergeStateListDialog(null);
    openModal(TextDiffEditorDialog, {
      initialMergeFromRootMetaPath: mergeState.rootFullPathToMetaMergeFrom,
      initialMergeToRootMetaPath: mergeState.rootFullPathToMetaMergeTo,
      editable: mergeState.editable
    });
  }


  return <div className={`flex items-baseline`}>
      <div className="grid grid-cols-[91%_9%] min-w-[1075px] ">
        <div className={`${mergeState.isUpToDate ? "" : "bg-red-400"} w-full`}>
          {mergeStateRowText(mergeState)}
        </div>
        <div className="flex flex-row relative top-[10%] ml-8 gap-x-8">
          <button onClick={() => openModal(ShowMergeStateInfoDialog, {mergeState, setIsInfoDialogShown})} className="cursor-pointer bg-blue-300 hover:bg-blue-500 relative"><InfoIcon className="bg-white text-blue-400 hover:bg-blue-400 hover:text-white"/></button>
          <button onClick={removeMergeStateOnClickHandler} className="cursor-pointer bg-red-500 hover:bg-red-600 relative"><Trash2 className="bg-white text-destructive hover:bg-destructive hover:text-black"/></button>
          <button onClick={openDiffEditor} className="cursor-pointer relative"><BookOpenTextIcon className="hover:bg-gray-400 hover:text-white"/></button>
        </div>
      </div>
    </div>;
}


function mergeStateRowText(mergeState: MergeState) {
  return <div className="grid grid-cols-[2fr_2fr_1fr_2fr_2fr] justify-center items-center gap-4">
      <span className="flex text-base font-medium whitespace-nowrap justify-center items-center truncate">
        {new Date(mergeState.createdAt).toLocaleString()}
      </span>
      <span className="flex text-base font-medium whitespace-nowrap justify-center items-center truncate">
        {new Date(mergeState.modifiedDiffTreeAt).toLocaleString()}
      </span>
      <span className="flex text-base font-medium whitespace-nowrap justify-center items-center truncate">{mergeState.mergeStateCause}</span>
      <div className="flex justify-center items-center truncate">
        {mergeStateSourceText(mergeState, "MergeFrom")}
      </div>
      <div className="flex justify-center items-center truncate">
        {mergeStateSourceText(mergeState, "MergeTo")}
      </div>
    </div>;
}

function mergeStateSourceText(mergeState: MergeState, side: "MergeFrom" | "MergeTo") {
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



function MergeStateListTooltip() {
  return <div>
    - If an entry is <p className="text-destructive inline">red</p>, then it means that it was modified from somewhere else than the diff editor.
    <br/>
    - From user perspective it means, that the user should double check the changes were performed by them and not somebody else.
    <br/>
    - Note that user should double check the modification time even if it is not red, to be sure that somebody else did not modify the entry from the diff editor.
    <br/>
    - When entry is <p className="text-destructive inline">red</p> it means, on a technical level, that the diff tree will be recomputed when fetched.
  </div>;
}
