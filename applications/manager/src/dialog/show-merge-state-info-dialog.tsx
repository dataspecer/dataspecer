import { useEffect } from "react";
import { BetterModalProps } from "@/lib/better-modal";
import { Modal, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { getHumanReadableFilesystemName, MergeState } from "@dataspecer/git";
import { useTranslation } from "react-i18next";

export enum BranchAction {
  CreateNewBranch,
  TurnExistingIntoBranch,
}

type ShowMergeStateInfoDialogProps = {
  mergeState: MergeState,
  setIsInfoDialogShown: (isShown: boolean) => void,
} & BetterModalProps<null>;


/**
 * Dialog that shows information about merge state.
 */
export const ShowMergeStateInfoDialog = ({ mergeState, setIsInfoDialogShown, isOpen, resolve }: ShowMergeStateInfoDialogProps) => {
  const { t } = useTranslation();
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
          <ModalTitle>{t("show-merge-state-info-dialog.title")}</ModalTitle>
        </ModalHeader>

        <div className="overflow-auto">
          <div className="text-sm">
            <strong>{t("show-merge-state-info-dialog.conflict-count")}</strong> {mergeState.conflictCount}
            <br/>
            <strong>{t("show-merge-state-info-dialog.merge-state-cause")}</strong> {mergeState.mergeStateCause}
            <br/>
            <br/>

            {mergeState.branchMergeFrom === mergeState.branchMergeTo ? (
              <div><strong>{t("show-merge-state-info-dialog.branch-label")}</strong> {mergeState.branchMergeFrom}</div>
            ) : (
              <div>
                <strong>{t("show-merge-state-info-dialog.merge-from-branch")}</strong> {mergeState.branchMergeFrom}
                <br/>
                <strong>{t("show-merge-state-info-dialog.merge-to-branch")}</strong> {mergeState.branchMergeTo}
              </div>
            )}
            <br/>
            <strong>{t("show-merge-state-info-dialog.created-at")}</strong> {new Date(mergeState.createdAt).toLocaleString()}
            <br/>
            <strong>{t("show-merge-state-info-dialog.modified-at")}</strong> {new Date(mergeState.modifiedDiffTreeAt).toLocaleString()}
            <br/>

            <div className="mt-1 text-sm">
              {mergeState.rootIriMergeFrom === mergeState.rootIriMergeTo ?
                (
                  <div><strong>{t("show-merge-state-info-dialog.iri-label")}</strong> {mergeState.rootIriMergeTo}</div>
                ) :
                (
                  <div>
                    <strong>{t("show-merge-state-info-dialog.merge-from-iri")}</strong> {mergeState.rootIriMergeFrom}
                    <br/>
                    <strong>{t("show-merge-state-info-dialog.merge-to-iri")}</strong> {mergeState.rootIriMergeTo}
                    <br/>
                    <br/>
                  </div>
                )
              }
              {mergeState.lastCommitHashMergeFrom === mergeState.lastCommitHashMergeTo ?
                (
                  <div><strong>{t("show-merge-state-info-dialog.commit-hash")}</strong> {mergeState.lastCommitHashMergeFrom}</div>
                ) :
                (
                  <div>
                    <strong>{t("show-merge-state-info-dialog.merge-from-commit-hash")}</strong> {mergeState.lastCommitHashMergeFrom}
                    <br/>
                    <strong>{t("show-merge-state-info-dialog.merge-to-commit-hash")}</strong> {mergeState.lastCommitHashMergeTo}
                    <br/>
                    <br/>
                  </div>
                )
              }
              {mergeState.filesystemTypeMergeFrom === mergeState.filesystemTypeMergeTo ?
                (
                  <div><strong>{t("show-merge-state-info-dialog.location-label")}</strong> {getHumanReadableFilesystemName(mergeState.filesystemTypeMergeFrom)}</div>
                ) :
                (
                  <div>
                    <strong>{t("show-merge-state-info-dialog.merge-from-location")}</strong> {getHumanReadableFilesystemName(mergeState.filesystemTypeMergeFrom)}
                    <br/>
                    <strong>{t("show-merge-state-info-dialog.merge-to-location")}</strong> {getHumanReadableFilesystemName(mergeState.filesystemTypeMergeTo)}
                    <br/>
                  </div>
                )
              }
              <strong>{t("show-merge-state-info-dialog.git-url")}</strong> <a className="text-blue-600 underline hover:text-blue-800" href={gitUrl}>{gitUrl}</a>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={closeModal}>
            {t("close")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
