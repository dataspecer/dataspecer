import { BetterModalProps, } from "@/lib/better-modal";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { MergeState } from "@dataspecer/git";

export enum DiffEditorOutsideChangeChosenAction {
  Nothing,
  Reload,
  Continue,
}

type ChooseActionForDiffEditorUnplannedChangeProps = {
  oldMergeState: MergeState,
  newMergeState: MergeState,
} & BetterModalProps<{
  result: DiffEditorOutsideChangeChosenAction,
}>;


export const ChooseActionForDiffEditorUnplannedChange = ({ oldMergeState, newMergeState, isOpen, resolve }: ChooseActionForDiffEditorUnplannedChangeProps) => {
  const handleReturn = (chosenResult: DiffEditorOutsideChangeChosenAction) => {
    resolve({ result: chosenResult });
  };


  return (
    <Modal open={isOpen} onClose={() => resolve({ result: DiffEditorOutsideChangeChosenAction.Nothing })}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Choose further action</ModalTitle>
            <ModalDescription>The package was modified while you were working in the diff editor</ModalDescription>
          </ModalHeader>
          <div>
            <div className="flex flex-1 flex-row">
              <strong>Cause:&nbsp;</strong>
              {
              newMergeState.isUpToDate ? <p>The merge state was modified by somebody else in different instance of diff editor.</p> : <p>The merge state was modified outside of editor.</p>
              }

            </div>
            <br/>

            Working version modified at <strong>{new Date(oldMergeState.modifiedDiffTreeAt).toLocaleString()}</strong>
            <br/>
            New version modified at <strong>{new Date(newMergeState.modifiedDiffTreeAt).toLocaleString()}</strong>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => handleReturn(DiffEditorOutsideChangeChosenAction.Nothing)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleReturn(DiffEditorOutsideChangeChosenAction.Reload)}>Reload</Button>
            <Button variant="default" onClick={() => handleReturn(DiffEditorOutsideChangeChosenAction.Continue)}>Save anyways</Button>
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
}
