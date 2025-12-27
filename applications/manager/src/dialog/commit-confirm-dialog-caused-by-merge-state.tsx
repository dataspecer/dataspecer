import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps, OpenBetterModal, useBetterModal } from "@/lib/better-modal";
import { CommitHttpRedirectionCause, CommitRedirectExtendedResponseJson } from "@dataspecer/git";
import { ListMergeStatesDialog } from "./list-merge-states-dialog";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { commitToGitRequest, mergeCommitToGitRequest } from "@/utils/git-backend-requests";


type CommitRedirectForMergeStatesProps = {
  commitRedirectResponse: CommitRedirectExtendedResponseJson;
} & BetterModalProps;

export const CommitRedirectForMergeStatesDialog = ({ commitRedirectResponse, isOpen, resolve }: CommitRedirectForMergeStatesProps) => {
  const openModal = useBetterModal();
  const dialogData = getDataForMergeStateDialog(commitRedirectResponse, openModal, resolve);

  if (dialogData === null) {
    return null;
  }

  return (
    <Modal open={isOpen} onClose={() => resolve()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Handle commit redirect due to existence of merge state</ModalTitle>
          <ModalDescription>{commitRedirectResponse.redirectMessage}</ModalDescription>
        </ModalHeader>
        {dialogData.dialogText}

        <ModalFooter>
          <Button variant="outline" onClick={dialogData.actionButton.onClickAction}>{dialogData.actionButton.buttonText}</Button>
          <Button variant="outline" onClick={dialogData.secondaryActionButton.onClickAction}>{dialogData.secondaryActionButton.buttonText}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const getDataForMergeStateDialog = (
  commitRedirectResponse: CommitRedirectExtendedResponseJson,
  openModal: OpenBetterModal,
  resolve: (value: void) => void
) => {
  let dialogText: React.ReactElement;
  let firstActionButtonText: string;
  let firstActionButtonOnClick;
  let secondaryActionButtonText: string;
  let secondaryActionButtonOnClick;

  if (commitRedirectResponse.commitHttpRedirectionCause === CommitHttpRedirectionCause.HasAtLeastOneMergeStateActive) {
    firstActionButtonText = "Commit anyways";
    firstActionButtonOnClick = () => {
      commitToGitRequest(commitRedirectResponse.iri, commitRedirectResponse.commitMessage, commitRedirectResponse.exportFormat, false, true);
      resolve();
    };
    secondaryActionButtonText = "Open merge states list";
    secondaryActionButtonOnClick = () => {
      openModal(ListMergeStatesDialog, { iri: commitRedirectResponse.iri }).finally(() => resolve());
    };
    dialogText = <div>
        You can either perform the commit or open the list of opened merge states or cancel the action of committing by closing dialog.
        <br/>
        <p>
          Note that there exists <span><strong>{commitRedirectResponse.openedMergeStatesCount}</strong></span> opened merge state{commitRedirectResponse.openedMergeStatesCount === 1 ? "" : "s"} for current package.
        </p>
      </div>;
  }
  else if (commitRedirectResponse.commitHttpRedirectionCause === CommitHttpRedirectionCause.HasExactlyOneMergeStateAndItIsResolvedAndCausedByMerge) {
    throw new Error("TODO RadStr: Implement");
    if (commitRedirectResponse.commitType === "rebase-commit") {
      firstActionButtonText = "Commit anyways";
      commitToGitRequest(commitRedirectResponse.iri, commitRedirectResponse.commitMessage, commitRedirectResponse.exportFormat, false, true);
      resolve();
      return null;
    }
    else if (commitRedirectResponse.commitType === "merge-commit") {
      if (commitRedirectResponse.shouldAppendAfterDefaultMergeCommitMessage === null) {
        console.error("shouldAppendAfterDefaultMergeCommitMessage is null, but it should be defined and of type boolean");
      }
      mergeCommitToGitRequest(
        commitRedirectResponse.iri, commitRedirectResponse.commitMessage, commitRedirectResponse.shouldAppendAfterDefaultMergeCommitMessage ?? true,
        commitRedirectResponse.exportFormat, commitRedirectResponse.mergeFromData!, false,
      );
      resolve();
      return null;
    }

    firstActionButtonText = "Open diff editor for merge state";
    firstActionButtonOnClick = () => {
      openModal(TextDiffEditorDialog, {
        initialMergeFromResourceIri: commitRedirectResponse.mergeStateCausedByMerge!.rootIriMergeFrom,
        initialMergeToResourceIri: commitRedirectResponse.mergeStateCausedByMerge!.rootIriMergeTo,
        editable: commitRedirectResponse.mergeStateCausedByMerge!.editable
      }).finally(() => resolve())
    };
    secondaryActionButtonText = "Commit anyways";
    secondaryActionButtonOnClick = () => {
      commitToGitRequest(commitRedirectResponse.iri, commitRedirectResponse.commitMessage, commitRedirectResponse.exportFormat, false, true);
      resolve();
    };
    dialogText = <p>
        You can either commit anyways.
        <br/>
        Or Open the diff editor for the merge state, check that everything is as you expect and finalize the merge state (that is close it with (merge) commit action).
        <br/>
        Or you can of course close this dialog.
      </p>;

  }
  else {
    throw new Error("Forgot to extend the CommitHttpRedirectionCauses. This is programmer error.");
  }

  return {
    dialogText,
    actionButton: {
      onClickAction: firstActionButtonOnClick,
      buttonText: firstActionButtonText,

    },
    secondaryActionButton: {
      onClickAction: secondaryActionButtonOnClick,
      buttonText: secondaryActionButtonText,
    },
  };
}
