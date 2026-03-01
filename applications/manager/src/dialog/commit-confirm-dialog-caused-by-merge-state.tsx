import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps, OpenBetterModal, useBetterModal } from "@/lib/better-modal";
import { CommitHttpRedirectionCause, CommitRedirectExtendedResponseJson, isSingleBranchCommitType } from "@dataspecer/git";
import { ListMergeStatesDialog } from "./list-merge-states-dialog";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { commitToGitHandler, mergeCommitToGitHandler } from "./git-actions-dialogs";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { GitCommitData } from "@/utils/git-backend-requests";


type CommitRedirectForMergeStatesProps = {
  commitRedirectResponse: CommitRedirectExtendedResponseJson;
} & BetterModalProps;

export const CommitRedirectForMergeStatesDialog = ({ commitRedirectResponse, isOpen, resolve }: CommitRedirectForMergeStatesProps) => {
  const didRun = useRef<boolean>(false);
  const openModal = useBetterModal();
  const { t } = useTranslation();

  const dialogData = useMemo(() => {
    if (didRun.current) {
      // We need this because of the strict react mode. Otherwise for example if we ran rebase for the case when we have 1 merge state that is caused by merge
      // We would commit twice.
      // ... Well technically, for the redirect we decided to never perform the redirect. Therefore, we never call it with the rabase value.
      // ... However, if we decided to bring it back one day, then this is needed.
      return null;
    }
    didRun.current = true;
    return getDataForMergeStateDialog(t, commitRedirectResponse, openModal, resolve);
  }, []);

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
          <Button variant="default" onClick={dialogData.actionButton.onClickAction}>{dialogData.actionButton.buttonText}</Button>
          <Button variant="outline" onClick={dialogData.secondaryActionButton.onClickAction}>{dialogData.secondaryActionButton.buttonText}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const getDataForMergeStateDialog = (
  t: TFunction<"translation", undefined>,
  commitRedirectResponse: CommitRedirectExtendedResponseJson,
  openModal: OpenBetterModal,
  resolve: (value: void) => void
) => {
  let dialogText: React.ReactElement;
  let firstActionButtonText: string;
  let firstActionButtonOnClick;
  let secondaryActionButtonText: string;
  let secondaryActionButtonOnClick;

  const gitCommitData: GitCommitData = {
    commitMessage: commitRedirectResponse.commitMessage,
    exportFormat: commitRedirectResponse.exportFormat,
    exportVersion: commitRedirectResponse.exportVersion,
    shouldAlwaysCreateMergeState: commitRedirectResponse.shouldAlwaysCreateMergeState,
  };

  if (commitRedirectResponse.commitHttpRedirectionCause === CommitHttpRedirectionCause.HasAtLeastOneMergeStateActive) {
    const commitType = commitRedirectResponse.commitType;
    if (!isSingleBranchCommitType(commitType)) {
      throw new Error(`Expected ${commitRedirectResponse.commitType} to be a not merge commit.`);
    }
    firstActionButtonText = "Commit anyways";
    firstActionButtonOnClick = async () => {
      await commitToGitHandler(
        t, openModal, commitRedirectResponse.iri, commitType, true, gitCommitData, false, commitRedirectResponse.onSuccessCallback);
      resolve();
    };
    secondaryActionButtonText = "Open merge states list";
    secondaryActionButtonOnClick = () => {
      openModal(ListMergeStatesDialog, { iri: commitRedirectResponse.iri }).finally(() => resolve());
    };
    dialogText = <div>
        <p>
          There are currently <span><strong>{commitRedirectResponse.openedMergeStatesCount}</strong></span> opened merge state{commitRedirectResponse.openedMergeStatesCount === 1 ? "" : "s"} for current package.
        </p>
        <br/>
        You can:
        <br/>

        - Perform the commit
        <br/>
        - Open the list of existing merge states
        <br/>
        - Cancel the action of committing by closing dialog
        <br/>
      </div>;
  }
  else if (commitRedirectResponse.commitHttpRedirectionCause === CommitHttpRedirectionCause.HasExactlyOneMergeStateAndItIsResolvedAndCausedByMerge) {
    // Ok this is special case, which is "obvious" to solve - that is we wanted to commit and the type of commit is obvious by the fact that we have single merge state.
    // Either it was rebase commit - then we just perform it
    // Or it was merge commit, then we just perform it - though we no longer perform the redirect for merge or rebase commits (so these 2 are dead code ... for now)
    //   the allowed types are either "rebase-commit" or "classic-commit"
    // Or it was just classic commit, then the user can either choose to do rebase commit or open the diff editor
    if (commitRedirectResponse.commitType === "rebase-commit") {
      firstActionButtonText = "Commit anyways";
      commitToGitHandler(
        t, openModal, commitRedirectResponse.iri, commitRedirectResponse.commitType, true, gitCommitData, false, commitRedirectResponse.onSuccessCallback);
      resolve();
      return null;
    }
    else if (commitRedirectResponse.commitType === "merge-commit") {
      if (commitRedirectResponse.shouldAppendAfterDefaultMergeCommitMessage === null) {
        console.error("shouldAppendAfterDefaultMergeCommitMessage is null, but it should be defined and of type boolean");
      }
      if (commitRedirectResponse.mergeStateCausedByMerge === null) {
        throw new Error("The redirection cause is HasExactlyOneMergeStateAndItIsResolvedAndCausedByMerge, but the merge state is null");
      }
      mergeCommitToGitHandler(
        t, openModal, commitRedirectResponse.iri, commitRedirectResponse.mergeStateCausedByMerge, commitRedirectResponse.commitMessage,
        commitRedirectResponse.shouldAppendAfterDefaultMergeCommitMessage ?? true, commitRedirectResponse.exportFormat);
      resolve();
      return null;
    }

    firstActionButtonText = "Open diff editor for merge state";
    firstActionButtonOnClick = () => {
      openModal(TextDiffEditorDialog, {
        initialMergeFromRootMetaPath: commitRedirectResponse.mergeStateCausedByMerge!.rootFullPathToMetaMergeFrom,
        initialMergeToRootMetaPath: commitRedirectResponse.mergeStateCausedByMerge!.rootFullPathToMetaMergeTo,
        editable: commitRedirectResponse.mergeStateCausedByMerge!.editable
      }).finally(() => resolve())
    };

    const commitType = commitRedirectResponse.commitType;
    if (!isSingleBranchCommitType(commitType)) {
      throw new Error(`Expected ${commitRedirectResponse.commitType} to be a not merge commit.`);
    }
    secondaryActionButtonText = "Commit anyways";
    secondaryActionButtonOnClick = async () => {
      await commitToGitHandler(
        t, openModal, commitRedirectResponse.iri, commitType, true, gitCommitData, false, commitRedirectResponse.onSuccessCallback);
      resolve();
    };
    dialogText = <p>
        <strong>Available actions:</strong>
        <br/>
        - Commit
        <br/>
        - Open the diff editor for the merge state, and finalize it
        <br/>
        - Close this dialog and handle it later
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
