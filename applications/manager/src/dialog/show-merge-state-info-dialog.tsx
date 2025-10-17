import { BetterModalProps, } from "@/lib/better-modal";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { MergeState } from "@dataspecer/git";

export enum BranchAction {
  CreateNewBranch,
  TurnExistingIntoBranch,
}

type ShowMergeStateInfoDialogProps = {
  mergeState: MergeState
} & BetterModalProps<null>;


export const ShowMergeStateInfoDialog = ({ mergeState, isOpen, resolve }: ShowMergeStateInfoDialogProps) => {
  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
        <ModalContent className="max-w-[30%]">
          <ModalHeader>
            <ModalTitle>Info about merge state</ModalTitle>
            <ModalDescription>id: {mergeState.uuid}</ModalDescription>
          </ModalHeader>
          <div>
            <div>
              <strong>Conflict count:</strong> {mergeState.conflictCount}
              <br/>
              <strong>Merge state cause:</strong> {mergeState.mergeStateCause}
              <br/>
              {
                mergeState.branchMergeFrom === mergeState.branchMergeTo ?
                  <div><strong>Branch:</strong> {mergeState.branchMergeFrom}</div> :
                  <div>
                    <strong>Merge from branch:</strong> {mergeState.branchMergeFrom}
                    <br/>
                    <strong>Merge to Branch:</strong> {mergeState.branchMergeTo}
                  </div>
              }
              <strong>Merge from last commit:</strong> {mergeState.lastCommitHashMergeFrom}
              <br/>
              <strong>Merge to last commit:</strong> {mergeState.lastCommitHashMergeTo}
              <br/>
              <strong>Merge from filesystem:</strong> {mergeState.filesystemTypeMergeFrom}
              <br/>
              <strong>Merge To filesystem:</strong> {mergeState.filesystemTypeMergeTo}
              <br/>
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => resolve(null)}>Close</Button>
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
}