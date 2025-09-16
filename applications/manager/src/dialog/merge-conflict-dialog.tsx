import { BetterModalProps, OpenBetterModal, useBetterModal, } from "@/lib/better-modal";
import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { MergeState } from "@dataspecer/git";

type MergeStateDialogProps = {
  iri: string,
} & BetterModalProps<null>;

export const MergeStatesDialog = ({ iri, isOpen, resolve }: MergeStateDialogProps) => {
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

  console.info({mergeStates});

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="min-w-[650px]">
        <ModalHeader>
          <ModalTitle>Merge states:</ModalTitle>
          <ModalDescription>
            TODO RadStr: Description
          </ModalDescription>
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" /> }
          {
          !isLoading && <>
            {/* The header */}
            <div className="grid grid-cols-2 divide-x divide-gray-300">
              <div className="flex items-center justify-center">Merge from</div>
              <div className="flex items-center justify-center">Merge to</div>
            </div>

            { mergeStates.map(mergeState => renderMergeState(mergeState, openModal)) }
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

const renderMergeState = (mergeState: MergeState, openModal: OpenBetterModal) => {
  return <div className={`flex ${mergeState.isUpToDate ? "" : "bg-red-500"} items-baseline space-x-2 hover:bg-gray-300`}>
      <button onClick={() => openModal(TextDiffEditorDialog, { initialOriginalResourceIri: mergeState.rootIriMergeFrom, initialModifiedResourceIri: mergeState.rootIriMergeTo, editable: mergeState.editable})}>
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
    </div>;
}
