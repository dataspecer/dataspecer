import { BetterModalProps, OpenBetterModal, useBetterModal, } from "@/lib/better-modal";
import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { MergeState } from "@/components/directory-diff";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { Button } from "@/components/ui/button";

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
          {!isLoading && mergeStates.map(mergeState => renderMergeState(mergeState, openModal))}
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => resolve(null)}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const renderMergeState = (mergeState: MergeState, openModal: OpenBetterModal) => {
  return <div className="flex items-baseline space-x-2">
      <button onClick={() => openModal(TextDiffEditorDialog, {initialOriginalResourceNameInfo: {resourceIri: mergeState.rootIriMergeFrom, modelName: ""}, initialModifiedResourceIri: {resourceIri: mergeState.rootIriMergeTo, modelName: ""}})}>
        <span className="text-lg font-medium">{mergeState.rootIriMergeFrom}</span>
        <span className="text-sm text-gray-500">{mergeState.filesystemTypeMergeFrom}</span>
        <span className="text-sm text-gray-500">{"->"}</span>
        <span className="text-lg font-medium">{mergeState.rootIriMergeTo}</span>
        <span className="text-sm text-gray-500">{mergeState.filesystemTypeMergeTo}</span>
      </button>
    </div>;
}
