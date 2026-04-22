import { BetterModalProps, } from "@/lib/better-modal";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { MergeState } from "@dataspecer/git";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";

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
            <ModalTitle>Changes detected outside the editor</ModalTitle>
            <ModalDescription>{newMergeState.isUpToDate ? <p>The modification came from another diff editor instance.</p> : <p>The modification came from another component of Dataspecer and not another instance of diff editor.</p>}</ModalDescription>
          </ModalHeader>
          <div>
            Working version modified at <strong>{new Date(oldMergeState.modifiedDiffTreeAt).toLocaleString()}</strong>
            <br/>
            New version modified at <strong>{new Date(newMergeState.modifiedDiffTreeAt).toLocaleString()}</strong>
            <br/>
            <br/>
            <strong>Cancel</strong> closes the dialog, but keeps the diff editor unchanged.
            <br/>
            <strong>Discard changes</strong> discards your changes and resets the editor.
            <br/>
            <div className="flex flex-1 flex-row"><strong>Save changes</strong>&nbsp;saves your changes to backend.<SaveChangesTooltip/></div>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => handleReturn(DiffEditorOutsideChangeChosenAction.Nothing)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleReturn(DiffEditorOutsideChangeChosenAction.Reload)}>Discard changes</Button>
            <Button variant="destructive" onClick={() => handleReturn(DiffEditorOutsideChangeChosenAction.Continue)}>Save changes</Button>
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
}

export const saveChangesTooltipText: string = "Only the files loaded in diff editor are saved. That is those which you touched while working in diff editor. They can be identified by the 📥 icon next to them.";

function SaveChangesTooltip() {
  return <div>
    <PopOverGitGeneralComponent>
      <div>{saveChangesTooltipText}</div>
    </PopOverGitGeneralComponent>
  </div>
}
