import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps, OpenBetterModal, useBetterModal } from "@/lib/better-modal";
import { CommitHttpRedirectionCause, CommitRedirectExtendedResponseJson, isSingleBranchCommitType } from "@dataspecer/git";
import { ListMergeStatesDialog } from "./list-merge-states";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { commitToGitHandler, mergeCommitToGitHandler } from "./git-actions-dialogs";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { GitCommitData } from "@/utils/git-backend-requests";


type CommitRedirectForMergeStatesProps = {
  commitRedirectResponse: CommitRedirectExtendedResponseJson;
} & BetterModalProps;

/**
 * This dialog handles the redirects during committing. The redirects are caused by existence of merge states.
 *  For example, if merge state already exists during commit we inform user if they do not want ot resolve it first.
 */
export const CommitRedirectForMergeStatesDialog = ({ commitRedirectResponse, isOpen, resolve }: CommitRedirectForMergeStatesProps) => {
  const didRun = useRef<boolean>(false);
  const openModal = useBetterModal();
  const { t } = useTranslation();

  const dialogData = useMemo(() => {
    if (didRun.current) {
      // We need this because of the strict react mode. Otherwise for example if we ran rebase for the case when we have 1 merge state that is caused by merge
      // We would commit twice.
      // ... Well technically, for the redirect we decided to never perform the redirect. Therefore, we never call it with the rebase value.
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
          <ModalTitle>{t("commit-redirect-dialog.title")}</ModalTitle>
          <ModalDescription>{commitRedirectResponse.redirectMessage}</ModalDescription>
        </ModalHeader>
        {dialogData.dialogText}

        <ModalFooter>
          <Button variant="outline" onClick={dialogData.secondaryActionButton.onClickAction}>{dialogData.secondaryActionButton.buttonText}</Button>
          <Button variant="default" onClick={dialogData.actionButton.onClickAction}>{dialogData.actionButton.buttonText}</Button>
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

  const commitType = commitRedirectResponse.commitType;
  let gitCommitData: GitCommitData | null = null;     // null if merge commit
  if (isSingleBranchCommitType(commitType)) {
    gitCommitData = {
      commitMessage: commitRedirectResponse.commitMessage,
      exportFormat: commitRedirectResponse.exportFormat,
      exportVersion: commitRedirectResponse.exportVersion,
      shouldAlwaysCreateMergeState: commitRedirectResponse.shouldAlwaysCreateMergeState,
      commitType: commitType,
    };
  }

  if (commitRedirectResponse.commitHttpRedirectionCause === CommitHttpRedirectionCause.HasAtLeastOneMergeStateActive) {
    if (gitCommitData === null) {
      throw new Error(`Expected ${commitRedirectResponse.commitType} to be a not merge commit.`);
    }
    firstActionButtonText = t("commit-redirect-dialog.button.commit-anyways");
    firstActionButtonOnClick = async () => {
      await commitToGitHandler(
        t, openModal, commitRedirectResponse.iri, true, gitCommitData, false, commitRedirectResponse.onSuccessCallback);
      resolve();
    };
    secondaryActionButtonText = t("commit-redirect-dialog.button.open-merge-states-list");
    secondaryActionButtonOnClick = () => {
      openModal(ListMergeStatesDialog, { iri: commitRedirectResponse.iri }).finally(() => resolve());
    };
    const mergeStateCountPrefix = commitRedirectResponse.openedMergeStatesCount === 1
      ? t("commit-redirect-dialog.merge-state-count.prefix.one")
      : t("commit-redirect-dialog.merge-state-count.prefix.other");
    const mergeStateCountSuffix = commitRedirectResponse.openedMergeStatesCount === 1
      ? t("commit-redirect-dialog.merge-state-count.suffix.one")
      : t("commit-redirect-dialog.merge-state-count.suffix.other");
    dialogText = <div>
        <p>
          {mergeStateCountPrefix} <strong>{commitRedirectResponse.openedMergeStatesCount}</strong> {mergeStateCountSuffix}
        </p>
        <br/>
        <strong>{t("commit-redirect-dialog.available-actions-title")}</strong>
        <br/>

        - {t("commit-redirect-dialog.actions.perform-commit")}
        <br/>
        - {t("commit-redirect-dialog.actions.open-merge-states-list")}
        <br/>
        - {t("commit-redirect-dialog.actions.cancel-commit")}
        <br/>
      </div>;
  }
  else if (commitRedirectResponse.commitHttpRedirectionCause === CommitHttpRedirectionCause.HasExactlyOneMergeStateAndItIsResolvedAndCausedByMerge) {
    // !!!!!!!!!!!! Note that neither the rebase-commit and merge-commit branches cannot be reached, since we have decided that we redirect only for the classic commit
    //              (That is pass in the shouldRedirect paramemter set to true only for classic commits)

    // Ok this is special case, which is "obvious" to solve - that is we wanted to commit and the type of commit is obvious by the fact that we have single merge state.
    // Either it was rebase commit - then we just perform it
    // Or it was merge commit, then we just perform it - though we no longer perform the redirect for merge or rebase commits (so these 2 are dead code ... for now)
    //   the allowed types are either "rebase-commit" or "classic-commit"
    // Or it was just classic commit, then the user can either choose to do rebase commit or open the diff editor
    if (commitRedirectResponse.commitType === "rebase-commit") {
      firstActionButtonText = t("commit-redirect-dialog.button.commit-anyways");
      commitToGitHandler(
        t, openModal, commitRedirectResponse.iri, true, gitCommitData!, false, commitRedirectResponse.onSuccessCallback);
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
        t, openModal, commitRedirectResponse.iri, commitRedirectResponse.mergeStateCausedByMerge, commitRedirectResponse,
        commitRedirectResponse.shouldAppendAfterDefaultMergeCommitMessage ?? true);
      resolve();
      return null;
    }

    firstActionButtonText = t("commit-redirect-dialog.button.open-diff-editor");
    firstActionButtonOnClick = () => {
      openModal(TextDiffEditorDialog, {
        initialMergeFromRootMetaPath: commitRedirectResponse.mergeStateCausedByMerge!.rootFullPathToMetaMergeFrom,
        initialMergeToRootMetaPath: commitRedirectResponse.mergeStateCausedByMerge!.rootFullPathToMetaMergeTo,
        editable: commitRedirectResponse.mergeStateCausedByMerge!.editable
      }).finally(() => resolve())
    };

    if (gitCommitData === null) {
      throw new Error(`Expected ${commitRedirectResponse.commitType} to be a not merge commit.`);
    }
    secondaryActionButtonText = t("commit-redirect-dialog.button.commit-anyways");
    secondaryActionButtonOnClick = async () => {
      await commitToGitHandler(
        t, openModal, commitRedirectResponse.iri, true, gitCommitData, false, commitRedirectResponse.onSuccessCallback);
      resolve();
    };
    dialogText = <p>
        <strong>{t("commit-redirect-dialog.available-actions-title")}</strong>
        <br/>
        - {t("commit-redirect-dialog.actions.perform-commit")}
        <br/>
        - {t("commit-redirect-dialog.actions.open-diff-editor")}
        <br/>
        - {t("commit-redirect-dialog.actions.close-and-handle-later")}
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
