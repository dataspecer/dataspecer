import { BetterModalProps, OpenBetterModal, useBetterModal, } from "@/lib/better-modal";
import { useEffect, useState } from "react";
import { BookOpenTextIcon, InfoIcon, Loader, Trash2 } from "lucide-react";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { getHumanReadableFilesystemName, getHumanReadableFilesystemShortName, MergeState } from "@dataspecer/git";
import { removeMergeState } from "@/utils/merge-state-backend-requests";
import { ShowMergeStateInfoDialog } from "./show-merge-state-info-dialog";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { requestLoadPackage } from "@/package";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";

type MergeStateDialogProps = {
  iri: string,
} & BetterModalProps<null>;


/**
 * Lists the merge states for data specification with the given IRI.
 */
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
      <ModalContent className="md:min-w-[1300px]">
        <ModalHeader>
          <ModalTitle>List of currently opened merge states for chosen data specification <PopOverGitGeneralComponent><MergeStateListTooltip/></PopOverGitGeneralComponent></ModalTitle>
          <ModalDescription>
            <p className="flex flex-1 flex-row">The entries are sorted by creation date (newest first).</p>
            <p className="flex flex-1 flex-row">Do not be afraid to remove merge states and create new ones of the same type.</p>
            <p className="flex flex-1 flex-row">Merge states caused by pull, that were created automatically can be resolved by removing the merge state and</p>
            <p className="flex flex-1 flex-row">&nbsp;&nbsp;&nbsp;&nbsp;performing manual pull again if you did not do any action between the the pull and last Git operation.</p>
            <p className="flex flex-1 flex-row">You can resolve merge states in any order. For guidance, see this hint.<PopOverGitGeneralComponent><MergeStateResolveOrderTooltip/></PopOverGitGeneralComponent></p>
          </ModalDescription>
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" /> }
          {
          !isLoading && <>
            {/* The header */}
            {/* The ml-4 is here for the first button, otherwise the merge state cause in the rows is shifted */}
            <div className="grid grid-cols-[86%_14%]">
              <div className="grid grid-cols-[2fr_2fr_1fr_2.1fr_2.1fr] divide-x divide-gray-300 min-w-[1000px] max-lg:min-w-[1000px]">
                <div className="flex items-center justify-center">Created at</div>
                <div className="flex items-center justify-center">Last modified at</div>
                <div className="flex items-center justify-center">Cause</div>
                <div className="flex items-center justify-center">Merge from</div>
                <div className="flex items-center justify-center">Merge to</div>
              </div>
            </div>

            { mergeStates
              .sort((a: MergeState, b: MergeState) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(mergeState => renderMergeState(mergeState, removeFromMergeStatesInDialog, setIsInfoDialogShown, openModal, resolve)) }
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

/**
 * Renders a single merge state.
 */
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
      <div className="grid grid-cols-[91%_9%] min-w-[1175px] ">
        <div className={`${mergeState.isUpToDate ? "" : "bg-red-400"} w-full`}>
          {mergeStateRowText(mergeState)}
        </div>
        <div className="flex flex-row relative top-[10%] ml-8 gap-x-8">
          <button title="Open merge state in diff editor" onClick={openDiffEditor} className="cursor-pointer relative">
            <BookOpenTextIcon className="hover:bg-gray-400 dark:hover:bg-gray-700 hover:text-white dark:text-gray-200"/>
          </button>
          <button title="Show info about merge state" onClick={() => openModal(ShowMergeStateInfoDialog, {mergeState, setIsInfoDialogShown})} className="cursor-pointer hover:bg-blue-500 relative">
            <InfoIcon className="text-blue-400 hover:bg-blue-400 hover:text-white dark:hover:bg-blue-700"/>
          </button>
          <button title="Remove merge state" onClick={removeMergeStateOnClickHandler} className="cursor-pointer hover:bg-red-600 relative">
            <Trash2 className="text-destructive hover:bg-destructive hover:text-black dark:hover:text-white"/>
          </button>
        </div>
      </div>
    </div>;
}


function mergeStateRowText(mergeState: MergeState) {
  return <div className="grid grid-cols-[2fr_2fr_1fr_2.1fr_2.1fr] justify-center items-center gap-4">
      <span title={new Date(mergeState.createdAt).toLocaleString()}
            className="flex text-base font-medium whitespace-nowrap justify-center items-center truncate">
        {new Date(mergeState.createdAt).toLocaleString()}
      </span>
      <span title={new Date(mergeState.modifiedDiffTreeAt).toLocaleString()}
            className="flex text-base font-medium whitespace-nowrap justify-center items-center truncate">
        {new Date(mergeState.modifiedDiffTreeAt).toLocaleString()}
      </span>
      <span title={mergeState.mergeStateCause}
            className="flex text-base font-medium whitespace-nowrap justify-center items-center truncate">
        {mergeState.mergeStateCause}
      </span>
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
      <span title={mergeState[`branch${side}`]}
            className="text-base font-medium whitespace-nowrap truncate max-w-[4cm]">
        {mergeState[`branch${side}`]}
      </span>
      <span title={getHumanReadableFilesystemName(mergeState[`filesystemType${side}`])}
            className="text-xs text-gray-500 whitespace-nowrap pl-1 pt-1 max-w-[4cm]">
        {getHumanReadableFilesystemShortName(mergeState[`filesystemType${side}`])}
      </span>
    </>;
}


function MergeStateListTooltip() {
  return <div>
    - If an entry is <p className="text-destructive inline">red</p>, then it means that it was modified from somewhere else than the diff editor of the corresponding merge state.
    <br/>
    - From user perspective it means, that the user should double check the changes were performed by them and not somebody else.
    <br/>
    - Note that user should double check the modification time even if it is not red, to be sure that somebody else did not modify the entry from the diff editor.
    <br/>
    - When entry is <p className="text-destructive inline">red</p> it means, on a technical level, that the diff tree will be recomputed when fetched.
  </div>;
}

function MergeStateResolveOrderTooltip() {
  return <div>
    - If you are completely stuck then remove all of the created merge states and do the following:
    <br/>
    <ul>
      <li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - If you are sure that you want to commit some changes. Simply commit.</li>
      <li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - If you just want to be up to date with the remote, then pull.</li>
      <li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; - If you want to merge, then make the two branches up to date (either by pulling or commiting) and create merge state for merge.</li>
    </ul>
    <br/>
    If you have in mind some actions and their order, then you can use the following hints:
    <br/>
    - In case of more merge states caused by pull. You can remove all the older ones and resolve only the newest one.
    <br/>
    &nbsp;&nbsp;&nbsp;&nbsp;You want to have the data specfication up to date with latest commit. Therefore, you can remove all "pulls" and create a new one.
    <br/>

    - If there is push conflict, once again you can only resolve the newest one and again remove all the others.
    <br/>
    &nbsp;&nbsp;&nbsp;&nbsp;Push conflicts should have higher priority than pull, since resolving push resolves pull internally (only internally).
    <br/>
    - Merge conflicts should be resolved last. After the Dataspecer state matches the expected remote state.
    <br/>
    &nbsp;&nbsp;&nbsp;&nbsp;Again do not be afraid to remove the merge state and create a new one.
  </div>;
}
