import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps, OpenBetterModal } from "@/lib/better-modal";
import { finalizeMergeMergeState, finalizeMergeMergeStateOnFailure, finalizePullMergeState, finalizePullMergeStateOnFailure, finalizePushMergeState, finalizePushMergeStateOnFailure, FinalizerResponse, removeMergeState } from "@/utils/merge-state-backend-requests";
import { AvailableFilesystems, FinalizerVariantsForPullOnFailure, getEditableValue, MergeCommitType, MergeState } from "@dataspecer/git";
import { Loader } from "lucide-react";
import { Dispatch, SetStateAction, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { commitToGitDialogOnClickHandler, mergeCommitToGitDialogOnClickHandler } from "./git-actions-dialogs";
import { requestLoadPackage, ResourcesContext } from "@/package";
import { useTranslation } from "react-i18next";
import { GIT_MERGE_VALIDATION_WAIT_TIME } from "@/utils/git-wait-times";
import Stepper from "@/components/merge-state-finalizer-stepper";


type MergeStateFinalizerProps = {
  mergeState: MergeState;
  openModal: OpenBetterModal;
} & BetterModalProps;

type MergeStateFinalizerSpecificCauseProps = {
  shouldRenderAnswerDialog: boolean;
  setShouldRenderAnswerDialog: Dispatch<SetStateAction<boolean>>;
  setIsWaitingForAnswer: Dispatch<SetStateAction<boolean>>;
} & Omit<MergeStateFinalizerProps, "isOpen">;

type MergeStateFinalizerMergeCauseProps = {
  secondsPassed: number;
  setSecondsAtStartofMerge: (value: number) => void;
} & MergeStateFinalizerSpecificCauseProps;

type MergeStateFinalizerAnswerDialogProps = {
  httpResponse: FinalizerResponse;
} & Omit<MergeStateFinalizerProps, "isOpen" | "openModal">;


/**
 * The main dialog for the merge state finalizer. Its content is decided based on the type of merge state.
 *  All of the finalizers are kind of similiar. They consists of some steps. Each merge state has a another component which is called within this main dialog.
 *  The purpose of this dialog is to simply show that something is loading or show the children merge state component.
 * All of the children dialogs are similar - they have the main dialog and on failure show another one, where user chooses the action with which should the error be handled.
 */
export const MergeStateFinalizerDialog = ({ mergeState, openModal, isOpen, resolve }: MergeStateFinalizerProps) => {
  const { t } = useTranslation();
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState<boolean>(false);
  const [shouldRenderAnswerDialog, setShouldRenderAnswerDialog] = useState<boolean>(false);
  const [secondsPassed, setSecondsPassed] = useState<number>(0);
  const [secondsAtStartOfMerge, setSecondsAtStartofMerge] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mergeState.mergeStateCause === "merge") {
      // This probably causes redrawing of the dialog each second (even when we are not counting), but since we are computing on client we can afford that
      interval = setInterval(() => {
        setSecondsPassed(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, []);


  let content: React.ReactElement;
  let waitingContent: React.ReactElement;
  if (mergeState.mergeStateCause === "merge") {
    content = MergeStateFinalizerForMerge({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, setIsWaitingForAnswer, secondsPassed, setSecondsAtStartofMerge, openModal, resolve });
    waitingContent = <div>
      <Stepper currentStep={1}/>
      <p>{t("merge-state.finalizer.waiting.validation")}</p>
      <br/>
      <p>{t("merge-state.finalizer.waiting.validation-duration", { lower: GIT_MERGE_VALIDATION_WAIT_TIME.lowerBound, upper: GIT_MERGE_VALIDATION_WAIT_TIME.upperBound })}</p>
      <div className="flex">
        <Loader className="mr-2 h-4 w-4 mt-1 animate-spin" /> {t("merge-state.finalizer.waiting.seconds-passed", { seconds: secondsPassed - secondsAtStartOfMerge })}
      </div>
    </div>;
  }
  else if (mergeState.mergeStateCause === "push") {
    content = MergeStateFinalizerForPush({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, setIsWaitingForAnswer, openModal, resolve });
    waitingContent = <div className="flex">
      <Loader className="mr-2 h-4 w-4 animate-spin" />
      {t("merge-state.finalizer.waiting.updating-merge-state")}
    </div>;
  }
  else if (mergeState.mergeStateCause === "pull") {
    content = MergeStateFinalizerForPull({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, setIsWaitingForAnswer, openModal, resolve });
    waitingContent = <div className="flex">
      <Loader className="mr-2 h-4 w-4 animate-spin" />
      {t("merge-state.finalizer.waiting.updating-merge-state")}
    </div>;
  }
  else {
    throw new Error("Unknown merge state cause, can't render finalizer dialog");
  }



  return (
    <Modal open={isOpen} onClose={() => resolve()}>
      <ModalContent className="min-h-[20%]">  { /* Otherwise there is a small dialog shown for a moment when we are moving to the last step at rebase/merge commit */ }
        {
        isWaitingForAnswer ?
          waitingContent :
          <>{content}</>
        }
      </ModalContent>
    </Modal>
  );
}

/**
 * The component shown for finalizer of merge state caused by pulling.
 */
const MergeStateFinalizerForPull = ({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, setIsWaitingForAnswer, resolve }: MergeStateFinalizerSpecificCauseProps) => {
  const { t } = useTranslation();
  const [httpResponse, setHttpResponse] = useState<FinalizerResponse>(null);

  const handlePullAction = async () => {
    setIsWaitingForAnswer(true);
    const response = await finalizePullMergeState(mergeState.uuid);
    const iri = getEditableValue(mergeState.editable, mergeState.rootIriMergeFrom, mergeState.rootIriMergeTo);
    requestLoadPackage(iri, true);
    setHttpResponse(response);
    if (response !== null) {
      if (response.status === 409) {
        toast.error(t("merge-state.finalizer.toast.unresolved-conflicts"), { "richColors": true });
        resolve();
      }
      else if (response.status < 300) {
        toast.success(t("merge-state.finalizer.toast.finalizer-finished"));
        resolve();
      }
      else if (response.status < 400) {
        // Probably do nothing - we will just show the another dialog.
        setIsWaitingForAnswer(false);
        setShouldRenderAnswerDialog(true);
      }
      else {
        toast.error(t("merge-state.finalizer.toast.error-finalizer"), { "richColors": true });
        setIsWaitingForAnswer(false);
        setShouldRenderAnswerDialog(true);
      }
    }
    else {
      toast.error(t("merge-state.finalizer.toast.error-finalizer"), { "richColors": true });
      setIsWaitingForAnswer(false);
      setShouldRenderAnswerDialog(true);
    }
  };


  return (
    shouldRenderAnswerDialog ?
      <MergeStateFinalizerForPullErrorDialog mergeState={mergeState} resolve={resolve} httpResponse={httpResponse} /> :
      <>
        <ModalHeader>
          <ModalTitle>{t("merge-state.finalizer.pull.title")}</ModalTitle>
          <ModalDescription>
            {t("merge-state.finalizer.pull.description.line.one")}
            <br/><br/>
            {t("merge-state.finalizer.pull.description.line.two")}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
        <Button variant="outline" onClick={() => resolve()}>{t("close")}</Button>
        <Button variant="default" onClick={() => handlePullAction()}>{t("merge-state.finalizer.pull.button.finish")}</Button>
        </ModalFooter>
      </>
  );
}

/**
 * Second dialog for pull finalizer. It is dialog that handles some sort of error when the parent pull dialog was finalizing the merge state.
 */
const MergeStateFinalizerForPullErrorDialog = ({ mergeState, resolve }: MergeStateFinalizerAnswerDialogProps) => {
  const { t } = useTranslation();
  const finalizerHandler = async (finalizerVariant: FinalizerVariantsForPullOnFailure) => {
    const response = await finalizePullMergeStateOnFailure(mergeState, finalizerVariant);
    if (response) {
      toast.success(t("merge-state.finalizer.toast.finalizing-successful"));
    }
    else {
      toast.error(t("merge-state.finalizer.toast.finalizing-failed"), { "richColors": true });
    }
    resolve();
  }

  return <>
      <ModalHeader>
        <ModalTitle>{t("merge-state.finalizer.pull.title")}</ModalTitle>
        <ModalDescription>
          {t("merge-state.finalizer.pull.error.description.line.one")}
          <br/>
          {t("merge-state.finalizer.pull.error.description.line.two")}
          <br/>
          {t("merge-state.finalizer.pull.error.description.line.three")}
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <Button variant="destructive" onClick={() => finalizerHandler("remove-merge-state")}>{t("merge-state.finalizer.pull.error.button.remove")}</Button>
        <Button variant="default" onClick={() => finalizerHandler("pull-anyways")}>{t("merge-state.finalizer.pull.error.button.update")}</Button>
      </ModalFooter>
    </>;
};


/**
 * Dialog for merge finalizer. Handles the decision between choosing merge/rebase.
 */
const MergeStateFinalizerForMerge = ({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, secondsPassed, setSecondsAtStartofMerge, setIsWaitingForAnswer, resolve, openModal }: MergeStateFinalizerMergeCauseProps) => {
  const { t } = useTranslation();
  const [httpResponse, setHttpResponse] = useState<FinalizerResponse>(null);
  const [chosenCommitType, setChosenCommitType] = useState<MergeCommitType | null>(null);

  const iri = getEditableValue(mergeState.editable, mergeState.rootIriMergeFrom, mergeState.rootIriMergeTo);
  const resources = useContext(ResourcesContext);
  const sourceDSPackage = resources[iri]!;

  const handleMergeAction = async () => {
    setSecondsAtStartofMerge(secondsPassed);
    setIsWaitingForAnswer(true);
    setChosenCommitType("merge-commit");
    const response = await finalizeMergeMergeState(mergeState.uuid, "merge-commit");
    if (response !== null) {
      if (response.status === 409) {
        toast.error(t("merge-state.finalizer.toast.unresolved-conflicts"), { "richColors": true });
        resolve();
      }
      else if (response.status < 300) {
        resolve();
        toast.success(t("merge-state.finalizer.toast.merge-proceed"));
        setTimeout(() => {
          mergeCommitToGitDialogOnClickHandler(t, openModal, iri, sourceDSPackage, mergeState);
        }, 10);     // Small delay to keep the background of same color (that is we wait until the resolve which closes the currently opened dialog is done)
      }
      else if (response.status < 400) {
        // Probably do nothing - we will just show the another dialog.
      }
      else {
        toast.error(t("merge-state.finalizer.toast.error-finalizer"), { "richColors": true });
      }
    }
    else {
      toast.error(t("merge-state.finalizer.toast.error-finalizer"), { "richColors": true });
    }
    setHttpResponse(response);
    setIsWaitingForAnswer(false);
    setShouldRenderAnswerDialog(true);
  };

  const handleRebaseAction = async () => {
    // Rebase behaves basically like classic merge state caused by push
    setSecondsAtStartofMerge(secondsPassed);
    setIsWaitingForAnswer(true);
    const response = await finalizeMergeMergeState(mergeState.uuid, "rebase-commit");
    if (response !== null) {
      if (response.status === 409) {
        toast.error(t("merge-state.finalizer.toast.unresolved-conflicts"), { "richColors": true });
        resolve();
      }
      else if (response.status < 300) {
        resolve();
        toast.success(t("merge-state.finalizer.toast.rebase-proceed"));
        const onSuccessCallback = async () => {
          await removeMergeState(mergeState.uuid);
          requestLoadPackage(mergeState.rootIriMergeFrom, true);
          requestLoadPackage(mergeState.rootIriMergeTo, true);
        };
        setTimeout(() => {
          commitToGitDialogOnClickHandler(t, openModal, iri, sourceDSPackage, "rebase-commit", false, mergeState.commitMessage, onSuccessCallback);
        }, 10);     // Same as for merge, small delay to keep the background same color.
      }
      else if (response.status < 400) {
        // Probably do nothing - we will just show the another dialog.
      }
      else {
        toast.error(t("merge-state.finalizer.toast.error-finalizer"), { "richColors": true });
      }
    }
    else {
      toast.error(t("merge-state.finalizer.toast.error-finalizer"), { "richColors": true });
    }
    setHttpResponse(response);
    setIsWaitingForAnswer(false);
    setShouldRenderAnswerDialog(true);
  };

  if (shouldRenderAnswerDialog) {
    if (chosenCommitType === "rebase-commit") {
      return <MergeStateFinalizerForPushErrorDialog mergeState={mergeState} resolve={resolve} httpResponse={httpResponse} />;
    }
    else {
      return <MergeStateFinalizerForMergeErrorDialog mergeState={mergeState} resolve={resolve} httpResponse={httpResponse} />;
    }
  }

  if (!mergeState.isMergeToBranch) {
    removeMergeState(mergeState.uuid);
    return (
      <>
        <ModalHeader>
          <ModalTitle>{t("merge-state.finalizer.no-branch.title")}</ModalTitle>
          <ModalDescription>
            {t("merge-state.finalizer.no-branch.description")}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => resolve()}>{t("close")}</Button>
        </ModalFooter>
      </>
    );
  }

  const rebaseCommitTooltip = t("merge-state.finalizer.button.rebase-tooltip");
  const mergeCommitTooltip = t("merge-state.finalizer.button.merge-tooltip");

  return (
    <>
      <ModalHeader>
        <ModalTitle>{t("merge-state.finalizer.merge.title")}</ModalTitle>
        <ModalDescription>
          <Stepper currentStep={0}/>
          <p>{t("merge-state.finalizer.merge.description.buttons-info", { suffix: mergeState.isMergeFromBranch ? "s" : "" })}</p>
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <Button variant="outline" className="border bg-blue-100 border-blue-500 hover:bg-blue-500 hover:text-white dark:bg-blue-900 dark:border-blue-400 dark:hover:bg-blue-500 dark:hover:text-white transition" title={rebaseCommitTooltip} onClick={() => handleRebaseAction()}>{t("merge-state.finalizer.button.rebase")}</Button>
        {mergeState.isMergeFromBranch && <Button variant="outline" className="border bg-green-100 border-green-500 hover:bg-green-500 hover:text-white dark:bg-green-900 dark:border-green-400 dark:hover:bg-green-500 dark:hover:text-white transition" title={mergeCommitTooltip} onClick={() => handleMergeAction()}>{t("merge-state.finalizer.button.merge")}</Button>}
      </ModalFooter>
    </>
  );
}


/**
 * Second dialog for merge finalizer. It is dialog that handles some sort of error when the parent pull dialog was finalizing the merge state.
 */
const MergeStateFinalizerForMergeErrorDialog = ({ mergeState, httpResponse, resolve }: MergeStateFinalizerAnswerDialogProps) => {
  const { t } = useTranslation();
  const removeMergeStateAction = async () => {
    const response = await finalizeMergeMergeStateOnFailure(mergeState.uuid, "remove-merge-state");
    if (response) {
      toast.success(t("merge-state.finalizer.toast.removed-merge-state"));
    }
    else {
      toast.error(t("merge-state.finalizer.toast.remove-merge-state-failed"), { "richColors": true });
    }
    if (mergeState.filesystemTypeMergeFrom === AvailableFilesystems.DS_Filesystem) {
      await requestLoadPackage(mergeState.rootIriMergeFrom, true);
    }
    if (mergeState.filesystemTypeMergeTo === AvailableFilesystems.DS_Filesystem) {
      await requestLoadPackage(mergeState.rootIriMergeTo, true);
    }
    resolve();
  }


  // TODO RadStr: Almost copy-pasted from the Answer dialog for push - if somebody will have time, they can refactor it
  if (httpResponse === null || httpResponse.status >= 300 || httpResponse?.status < 0) {
    let text = t("merge-state.finalizer.merge.error.unknown");
    if (httpResponse?.status === 409) {
      text = t("merge-state.finalizer.toast.unresolved-conflicts");
    }
    else if (httpResponse !== null && httpResponse.status >= 300 && httpResponse.status < 400) {
      text = t("merge-state.finalizer.merge.error.remote-head-moved");
    }
    else {
      if (httpResponse?.content?.error !== undefined && httpResponse?.content?.error !== null &&
          typeof httpResponse.content.error === "string" &&
          httpResponse.content.error.includes("does not match the local one")
      ) {
        text = httpResponse.content.error;
      }
    }
    return <>
      <ModalHeader>
        <ModalTitle>{t("merge-state.finalizer.merge.title")}</ModalTitle>
        <ModalDescription>
          <p className="whitespace-pre-line">{text}</p>
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <Button variant="destructive" onClick={() => removeMergeStateAction()}>{t("merge-state.finalizer.merge.error.button.remove")}</Button>
        <Button variant="outline" onClick={() => resolve()}>{t("merge-state.finalizer.merge.error.button.close")}</Button>
      </ModalFooter>
    </>;
  }
  return null;
};


/**
 * Dialog for push finalizer. Similarly to others it is the first one which handles the push and once again can trigger an error one.
 */
const MergeStateFinalizerForPush = ({ mergeState, setIsWaitingForAnswer, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, resolve, openModal }: MergeStateFinalizerSpecificCauseProps) => {
  const { t } = useTranslation();
  const [httpReponse, setHttpResponse] = useState<FinalizerResponse>(null);

  const iri = getEditableValue(mergeState.editable, mergeState.rootIriMergeFrom, mergeState.rootIriMergeTo);
  const resources = useContext(ResourcesContext);
  const sourceDSPackage = resources[iri]!;

  const finalizePush = async () => {
    setIsWaitingForAnswer(true);
    const response = await finalizePushMergeState(mergeState.uuid);
    requestLoadPackage(iri, true);

    if (response !== null) {
      if (response.status === 409) {
        toast.error(t("merge-state.finalizer.toast.unresolved-conflicts"), { "richColors": true });
        resolve();
      }
      else if (response.status < 300) {
        toast.success(t("merge-state.finalizer.toast.finalizer-finished"));
        resolve();
        commitToGitDialogOnClickHandler(t, openModal, iri, sourceDSPackage, "classic-commit", false, mergeState.commitMessage, null);
      }
      else if (response.status < 400) {
        // Probably do nothing - we will just show the another dialog.
      }
      else {
        toast.error(t("merge-state.finalizer.toast.error-finalizer"), { "richColors": true });
      }
    }
    else {
      toast.error(t("merge-state.finalizer.toast.error-finalizer"), { "richColors": true });
    }

    setHttpResponse(response);
    setIsWaitingForAnswer(false);
    setShouldRenderAnswerDialog(true);
  };

  return (
    shouldRenderAnswerDialog ?
      <MergeStateFinalizerForPushErrorDialog mergeState={mergeState} resolve={resolve} httpResponse={httpReponse} /> :
      <>
        <ModalHeader>
          <ModalTitle>{t("merge-state.finalizer.push.title")}</ModalTitle>
          <ModalDescription>
            {t("merge-state.finalizer.push.description.line.one")}
            <br/>
            <br/>
            {t("merge-state.finalizer.push.description.line.two")}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => resolve()}>{t("close")}</Button>
          <Button variant="default" onClick={() => finalizePush()}>{t("merge-state.finalizer.push.button.push")}</Button>
        </ModalFooter>
      </>
  );
}


/**
 * Second dialog for pull finalizer. It is dialog that handles some sort of error when the parent pull dialog was finalizing the merge state.
 */
const MergeStateFinalizerForPushErrorDialog = ({ mergeState, httpResponse, resolve }: MergeStateFinalizerAnswerDialogProps) => {
  const { t } = useTranslation();
  const finalizerHandler = async () => {
    const response = await finalizePushMergeStateOnFailure(mergeState.uuid, "remove-merge-state");
    if (response) {
      toast.success(t("merge-state.finalizer.toast.remove-merge-state-successful"));
    }
    else {
      toast.error(t("merge-state.finalizer.toast.remove-merge-state-failed"), { "richColors": true });
    }
    if (mergeState.filesystemTypeMergeFrom === AvailableFilesystems.DS_Filesystem) {
      await requestLoadPackage(mergeState.rootIriMergeFrom, true);
    }
    if (mergeState.filesystemTypeMergeTo === AvailableFilesystems.DS_Filesystem) {
      await requestLoadPackage(mergeState.rootIriMergeTo, true);
    }

    resolve();
  }


  if (httpResponse === null || httpResponse.status >= 300 || httpResponse.status < 0) {
    let text = t("merge-state.finalizer.push.error.unknown");
    if (httpResponse?.status === 409) {
      text = t("merge-state.finalizer.toast.unresolved-conflicts");
    }
    else if (httpResponse !== null && httpResponse.status >= 300 && httpResponse.status < 400) {
      text = t("merge-state.finalizer.push.error.remote-head-moved");
    }
    else {
      if (httpResponse?.content?.error !== undefined && httpResponse?.content?.error !== null &&
          typeof httpResponse.content.error === "string" &&
          httpResponse.content.includes("does not match the local one")) {
        text = httpResponse.content.error;
      }
    }
    return <>
      <ModalHeader>
        <ModalTitle>{t("merge-state.finalizer.push.error.title")}</ModalTitle>
        <ModalDescription>
          {text}
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <Button variant="destructive" onClick={() => finalizerHandler()}>{t("merge-state.finalizer.push.error.button.remove")}</Button>
        <Button variant="outline" onClick={() => resolve()}>{t("merge-state.finalizer.push.error.button.close")}</Button>
      </ModalFooter>
    </>;
  }
  return null;
};
