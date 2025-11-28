import { useState } from "react";
import { BetterModalProps } from "@/lib/better-modal";
import { Modal, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { getHumanReadableFilesystemName, MergeState } from "@dataspecer/git";
import { ChevronsDownIcon, ChevronsUpIcon } from "lucide-react";

export enum BranchAction {
  CreateNewBranch,
  TurnExistingIntoBranch,
}

type ShowMergeStateInfoDialogProps = {
  mergeState: MergeState
} & BetterModalProps<null>;

export const ShowMergeStateInfoDialog = ({ mergeState, isOpen, resolve }: ShowMergeStateInfoDialogProps) => {
  const [showMore, setShowMore] = useState(false);

  const gitUrl = mergeState.gitUrlMergeFrom === "" ?
    mergeState.gitUrlMergeTo :
    mergeState.gitUrlMergeFrom;

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="max-w-[40%]">
        <ModalHeader>
          <ModalTitle>Info about merge state</ModalTitle>
        </ModalHeader>

        <div>
          <div className="text-sm">
            <strong>Conflict count:</strong> {mergeState.conflictCount}
            <br/>
            <strong>Merge state cause:</strong> {mergeState.mergeStateCause}
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


            {/* ---- COLLAPSIBLE SECTION ---- */}
            <Button
              variant="ghost"
              className="mt-2 mb-2 p-0 underline text-sm"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? <ChevronsUpIcon /> : <ChevronsDownIcon />}
            </Button>

            {showMore && (
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
                    </div>
                  )
                }
                {mergeState.filesystemTypeMergeFrom === mergeState.filesystemTypeMergeTo ?
                  (
                    <div><strong>Location:</strong> {mergeState.filesystemTypeMergeFrom}</div>
                  ) :
                  (
                    <div>
                      <strong>Merge from location:</strong> {getHumanReadableFilesystemName(mergeState.filesystemTypeMergeFrom)}
                      <br/>
                      <strong>Merge to location:</strong> {getHumanReadableFilesystemName(mergeState.filesystemTypeMergeTo)}
                    </div>
                  )
                }
                <strong>Git Url:</strong> <a className="text-blue-600 underline hover:text-blue-800" href={gitUrl}>{gitUrl}</a>
              </div>
            )}
            {/* ---- END OF COLLAPSIBLE SECTION ---- */}
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => resolve(null)}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
