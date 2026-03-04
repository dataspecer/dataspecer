import { useEffect } from "react";
import { BetterModalProps } from "@/lib/better-modal";
import { Modal, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { getHumanReadableFilesystemName, MergeState } from "@dataspecer/git";

export enum BranchAction {
  CreateNewBranch,
  TurnExistingIntoBranch,
}

type ShowMergeStateInfoDialogProps = {
  mergeState: MergeState,
  setIsInfoDialogShown: (isShown: boolean) => void,
} & BetterModalProps<null>;

export const ShowMergeStateInfoDialog = ({ mergeState, setIsInfoDialogShown, isOpen, resolve }: ShowMergeStateInfoDialogProps) => {
  useEffect(() => {
    setIsInfoDialogShown(true);
  }, []);
  const closeModal = () => {
    setIsInfoDialogShown(false);
    resolve(null);
  };

  const gitUrl = mergeState.gitUrlMergeFrom === "" ?
    mergeState.gitUrlMergeTo :
    mergeState.gitUrlMergeFrom;

  return (
    <Modal open={isOpen} onClose={closeModal}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Info about merge state</ModalTitle>
        </ModalHeader>

        <div className="overflow-auto">
          <div className="text-sm">
            <strong>Conflict count:</strong> {mergeState.conflictCount}
            <br/>
            <strong>Merge state cause:</strong> {mergeState.mergeStateCause}
            <br/>
            <br/>

            {mergeState.branchMergeFrom === mergeState.branchMergeTo ? (
              <div><strong>Branch:</strong> {mergeState.branchMergeFrom}</div>
            ) : (
              <div>
                <strong>Merge from branch:</strong> {mergeState.branchMergeFrom}
                <br/>
                <strong>Merge to branch:</strong> {mergeState.branchMergeTo}
              </div>
            )}
            <br/>
            <strong>DiffTree created at:</strong> {new Date(mergeState.createdAt).toLocaleString()}
            <br/>
            <strong>DiffTree modified at:</strong> {new Date(mergeState.modifiedDiffTreeAt).toLocaleString()}
            <br/>

            <div className="mt-1 text-sm">
              {mergeState.rootIriMergeFrom === mergeState.rootIriMergeTo ?
                (
                  <div><strong>IRI:</strong> {mergeState.rootIriMergeTo}</div>
                ) :
                (
                  <div>
                    <strong>Merge from IRI:</strong> {mergeState.rootIriMergeFrom}
                    <br/>
                    <strong>Merge to IRI:</strong> {mergeState.rootIriMergeTo}
                    <br/>
                    <br/>
                  </div>
                )
              }
              {mergeState.lastCommitHashMergeFrom === mergeState.lastCommitHashMergeTo ?
                (
                  <div><strong>Commit hash:</strong> {mergeState.lastCommitHashMergeFrom}</div>
                ) :
                (
                  <div>
                    <strong>Merge from commit hash:</strong> {mergeState.lastCommitHashMergeFrom}
                    <br/>
                    <strong>Merge to commit hash:</strong> {mergeState.lastCommitHashMergeTo}
                    <br/>
                    <br/>
                  </div>
                )
              }
              {mergeState.filesystemTypeMergeFrom === mergeState.filesystemTypeMergeTo ?
                (
                  <div><strong>Location:</strong> {getHumanReadableFilesystemName(mergeState.filesystemTypeMergeFrom)}</div>
                ) :
                (
                  <div>
                    <strong>Merge from location:</strong> {getHumanReadableFilesystemName(mergeState.filesystemTypeMergeFrom)}
                    <br/>
                    <strong>Merge to location:</strong> {getHumanReadableFilesystemName(mergeState.filesystemTypeMergeTo)}
                    <br/>
                  </div>
                )
              }
              <strong>Git URL:</strong> <a className="text-blue-600 underline hover:text-blue-800" href={gitUrl}>{gitUrl}</a>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={closeModal}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
