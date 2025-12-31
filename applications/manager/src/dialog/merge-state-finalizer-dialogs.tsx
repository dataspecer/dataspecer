import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps, OpenBetterModal } from "@/lib/better-modal";
import { finalizeMergeMergeState, finalizeMergeMergeStateOnFailure, finalizePullMergeState, finalizePullMergeStateOnFailure, finalizePushMergeState, finalizePushMergeStateOnFailure, removeMergeState } from "@/utils/merge-state-backend-requests";
import { FinalizerVariantsForPullOnFailure, getEditableValue, MergeCommitType, MergeState } from "@dataspecer/git";
import { Loader } from "lucide-react";
import { Dispatch, SetStateAction, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { commitToGitDialogOnClickHandler, mergeCommitToGitDialogOnClickHandler } from "./git-url";
import { requestLoadPackage, ResourcesContext } from "@/package";


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
  httpStatus: number;
} & Omit<MergeStateFinalizerProps, "isOpen" | "openModal">;

export const MergeStateFinalizerDialog = ({ mergeState, openModal, isOpen, resolve }: MergeStateFinalizerProps) => {
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState<boolean>(false);
  const [shouldRenderAnswerDialog, setShouldRenderAnswerDialog] = useState<boolean>(false);
  const [secondsPassed, setSecondsPassed] = useState<number>(0);
  const [secondsAtStartOfMerge, setSecondsAtStartofMerge] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mergeState.mergeStateCause === "merge") {
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
      <p>Validating merge state against Git remote.</p>
      <p>Usually takes around 5-15 seconds.</p>
      <div className="flex">
        <Loader className="mr-2 h-4 w-4 mt-1 animate-spin" /> {secondsPassed - secondsAtStartOfMerge} seconds passed
      </div>
    </div>;
  }
  else if (mergeState.mergeStateCause === "push") {
    content = MergeStateFinalizerForPush({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, setIsWaitingForAnswer, openModal, resolve });
    waitingContent = <div className="flex">
      <Loader className="mr-2 h-4 w-4 animate-spin" />
      Updating last commit hash metadata and removing merge state.
    </div>;
  }
  else if (mergeState.mergeStateCause === "pull") {
    content = MergeStateFinalizerForPull({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, setIsWaitingForAnswer, openModal, resolve });
    waitingContent = <div className="flex">
      <Loader className="mr-2 h-4 w-4 animate-spin" />
      Updating last commit hash metadata and removing merge state.
    </div>;
  }
  else {
    throw new Error("Unknown merge state cause, can't render finalizer dialog");
  }



  return (
    <Modal open={isOpen} onClose={() => resolve()}>
      <ModalContent>
        {
        isWaitingForAnswer ?
          waitingContent :
          <>{content}</>
        }
      </ModalContent>
    </Modal>
  );
}


const MergeStateFinalizerForPull = ({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, setIsWaitingForAnswer, resolve }: MergeStateFinalizerSpecificCauseProps) => {
  const [httpStatusCode, setHttpStatusCode] = useState<number>(-1);

  const handlePullAction = async () => {
    setIsWaitingForAnswer(true);
    const response = await finalizePullMergeState(mergeState.uuid);
    const iri = getEditableValue(mergeState.editable, mergeState.rootIriMergeFrom, mergeState.rootIriMergeTo);
    requestLoadPackage(iri, true);
    if (response !== null) {
      if (response === 409) {
        toast.error("There are still unresolved conflicts");
        resolve();
      }
      else if (response < 300) {
        toast.success("Finalizer succcessfully finished");
        resolve();
      }
      else if (response < 400) {
        // TODO RadStr: Probably do nothing - we will just show the another dialog.
      }
      else {
        toast.error("There was error when finalizing, check console for more info");
      }
    }
    else {
      toast.error("There was error when finalizing, check console for more info");
    }
    setHttpStatusCode(response ?? -1);
    setIsWaitingForAnswer(false);
    setShouldRenderAnswerDialog(true);
  };


  return (
    shouldRenderAnswerDialog ?
      <MergeStateFinalizerForPullAnswerDialog mergeState={mergeState} resolve={resolve} httpStatus={httpStatusCode} /> :
      <>
        <ModalHeader>
          <ModalTitle>Finish merge state caused by pulling</ModalTitle>
          <ModalDescription>
            Clicking on finish pull will close the merge state and update last commit hash to reflect the pulled remote.
            Note that after pulling second dialog may appear if the package in DS is already ahead of the commit.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => handlePullAction()}>Finish pull</Button>
          <Button variant="outline" onClick={() => resolve()}>Close</Button>
        </ModalFooter>
      </>
  );
}

const MergeStateFinalizerForPullAnswerDialog = ({ mergeState, resolve }: MergeStateFinalizerAnswerDialogProps) => {
  const finalizerHandler = async (finalizerVariant: FinalizerVariantsForPullOnFailure) => {
    const response = await finalizePullMergeStateOnFailure(mergeState, finalizerVariant);
    if (response) {
      toast.success("Finalizing was successful");
    }
    else {
      toast.error("Finalizing ended in failure");
    }
    resolve();
  }

  return <>
      <ModalHeader>
        <ModalTitle>Finish merge state caused by pulling</ModalTitle>
        <ModalDescription>
          It appears that the commit, which is being pulled is already behind current commit inside DS.
          <br/>
          You can either remove the merge state and don't update the last commit for the package. Or update the last commit hash in DS (and remove the merge state).
          <br/>
          Or you can just close the dialog and decide later.
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <Button variant="outline" onClick={() => finalizerHandler("pull-anyways")}>Update the last commit hash in DS</Button>
        <Button variant="outline" onClick={() => finalizerHandler("remove-merge-state")}>Remove merge state</Button>
      </ModalFooter>
    </>;
};

const MergeStateFinalizerForMerge = ({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, secondsPassed, setSecondsAtStartofMerge, setIsWaitingForAnswer, resolve, openModal }: MergeStateFinalizerMergeCauseProps) => {
  const [httpStatusCode, setHttpStatusCode] = useState<number>(-1);
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
      if (response === 409) {
        toast.error("There are still unresolved conflicts");
        resolve();
      }
      else if (response < 300) {
        resolve();
        toast.success("Everything seems to be ok. Proceed with merging.");
        setTimeout(() => {
          mergeCommitToGitDialogOnClickHandler(openModal, iri, sourceDSPackage, mergeState);
        }, 10);     // Small delay to keep the background of same color (that is we wait until the resolve which closes the currently opened dialog is done)
      }
      else if (response < 400) {
        // TODO RadStr: Probably do nothing - we will just show the another dialog.
      }
      else {
        toast.error("There was error when finalizing, check console for more info");
      }
    }
    else {
      toast.error("There was error when finalizing, check console for more info");
    }
    setHttpStatusCode(response ?? -1);
    setIsWaitingForAnswer(false);
    setShouldRenderAnswerDialog(true);
  };

  const handleRebaseAction = async () => {
    // Rebase behaves basically like classic merge state caused by push
    setSecondsAtStartofMerge(secondsPassed);
    setIsWaitingForAnswer(true);
    const response = await finalizeMergeMergeState(mergeState.uuid, "rebase-commit");
    if (response !== null) {
      if (response === 409) {
        toast.error("There are still unresolved conflicts");
        resolve();
      }
      else if (response < 300) {
        resolve();
        toast.success("Everything seems to be ok. Proceed with rebasing.");
        const onSuccessCallback = async () => {
          await removeMergeState(mergeState.uuid);
          requestLoadPackage(mergeState.rootIriMergeFrom, true);
          requestLoadPackage(mergeState.rootIriMergeTo, true);
        };
        setTimeout(() => {
          commitToGitDialogOnClickHandler(openModal, iri, sourceDSPackage, "rebase-commit", false, mergeState.commitMessage, onSuccessCallback);
        }, 10);     // Same as for merge, small delay to keep the background same color.
      }
      else if (response < 400) {
        // TODO RadStr: Probably do nothing - we will just show the another dialog.
      }
      else {
        toast.error("There was error when finalizing, check console for more info");
      }
    }
    else {
      toast.error("There was error when finalizing, check console for more info");
    }
    setHttpStatusCode(response ?? -1);
    setIsWaitingForAnswer(false);
    setShouldRenderAnswerDialog(true);
  };

  if (shouldRenderAnswerDialog) {
    if (chosenCommitType === "rebase-commit") {
      return <MergeStateFinalizerForPushAnswerDialog mergeState={mergeState} resolve={resolve} httpStatus={httpStatusCode} />;
    }
    else {
      return <MergeStateFinalizerForMergeAnswerDialog mergeState={mergeState} resolve={resolve} httpStatus={httpStatusCode} />;
    }
  }

  if (!mergeState.isMergeToBranch) {
    removeMergeState(mergeState.uuid);
    return (
      <>
        <ModalHeader>
          <ModalTitle>Finishing merging to non-branch</ModalTitle>
          <ModalDescription>
            There is no action to perform. Merge state was removed.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => resolve()}>Close</Button>
        </ModalFooter>
      </>
    );
  }


  return (
    <>
      <ModalHeader>
        <ModalTitle>Finish merge state caused by merging</ModalTitle>
        <ModalDescription>
          You can choose to either:
          {mergeState.isMergeFromBranch && <p>&nbsp;&nbsp;<strong>-</strong> Create classic merge commit.</p>}
          <p>&nbsp;&nbsp;<strong>-</strong> Rebase commit = Create new commit and put the changes on top (basically same as fast-forward).</p>
          <p>&nbsp;&nbsp;<strong>-</strong> Close the dialog and handle it all later.</p>
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        {mergeState.isMergeFromBranch && <Button variant="outline" onClick={() => handleMergeAction()}>Create merge commit</Button>}
        <Button variant="outline" onClick={() => handleRebaseAction()}>Create rebase commit</Button>
      </ModalFooter>
    </>
  );
}

const MergeStateFinalizerForMergeAnswerDialog = ({ mergeState, httpStatus, resolve }: MergeStateFinalizerAnswerDialogProps) => {
  const removeMergeStateAction = async () => {
    const response = await finalizeMergeMergeStateOnFailure(mergeState.uuid, "remove-merge-state");
    if (response) {
      toast.success("Finalizing was successful");
    }
    else {
      toast.error("Finalizing ended in failure");
    }
    resolve();
  }


  if (httpStatus === null || httpStatus >= 300 || httpStatus < 0) {
    let text = "Unknown error when finalizing merge state caused by merging. You can check console for possible more info";
    if (httpStatus === 409) {
      text = "There are still unresolved conflicts";
    }
    else if (httpStatus >= 300 && httpStatus < 400) {
      text = `It appears that the remote head moved, therefore you are no longer pushing on top of the latest commit.
          You can either remove the merge state (and run push again, which will create new merge state) or close dialog.`;
    }
    return <>
      <ModalHeader>
        <ModalTitle>Finish merge state caused by merging</ModalTitle>
        <ModalDescription>
          {text}
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <Button variant="outline" onClick={() => removeMergeStateAction()}>Remove merge state</Button>
        <Button variant="outline" onClick={() => resolve()}>Close dialog</Button>
      </ModalFooter>
    </>;
  }
  return null;
};


const MergeStateFinalizerForPush = ({ mergeState, setIsWaitingForAnswer, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, resolve, openModal }: MergeStateFinalizerSpecificCauseProps) => {
  const [httpStatusCode, setHttpStatusCode] = useState<number>(-1);

  const iri = getEditableValue(mergeState.editable, mergeState.rootIriMergeFrom, mergeState.rootIriMergeTo);
  const resources = useContext(ResourcesContext);
  const sourceDSPackage = resources[iri]!;

  const finalizePush = async () => {
    setIsWaitingForAnswer(true);
    const response = await finalizePushMergeState(mergeState.uuid);
    requestLoadPackage(iri, true);

    if (response !== null) {
      if (response === 409) {
        toast.error("There are still unresolved conflicts");
        resolve();
      }
      else if (response < 300) {
        toast.success("Finalizer succcessfully finished");
        resolve();
        commitToGitDialogOnClickHandler(openModal, iri, sourceDSPackage, "classic-commit", false, mergeState.commitMessage, null);
      }
      else if (response < 400) {
        // TODO RadStr: Probably do nothing - we will just show the another dialog.
      }
      else {
        toast.error("There was error when finalizing, check console for more info");
      }
    }
    else {
      toast.error("There was error when finalizing, check console for more info");
    }

    setHttpStatusCode(response ?? -1);
    setIsWaitingForAnswer(false);
    setShouldRenderAnswerDialog(true);
  };

  return (
    shouldRenderAnswerDialog ?
      <MergeStateFinalizerForPushAnswerDialog mergeState={mergeState} resolve={resolve} httpStatus={httpStatusCode} /> :
      <>
        <ModalHeader>
          <ModalTitle>Finish merge state caused by pushing to remote repository</ModalTitle>
          <ModalDescription>
            You can either push the current content of package to git remote or close the dialog and finish later.
            <br/>
            <br/>
            Note that if the remote moved, you will be informed that the push failed.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => finalizePush()}>Push</Button>
          <Button variant="outline" onClick={() => resolve()}>Close dialog</Button>
        </ModalFooter>
      </>
  );
}


const MergeStateFinalizerForPushAnswerDialog = ({ mergeState, httpStatus, resolve }: MergeStateFinalizerAnswerDialogProps) => {
  const finalizerHandler = async () => {
    const response = await finalizePushMergeStateOnFailure(mergeState.uuid, "remove-merge-state");
    if (response) {
      toast.success("Finalizing was successful");
    }
    else {
      toast.error("Finalizing ended in failure");
    }
    resolve();
  }


  if (httpStatus === null || httpStatus >= 300 || httpStatus < 0) {
    let text = "Unknown error when finalizing merge state caused by pushing. You can check console for possible more info";
    if (httpStatus === 409) {
      text = "There are still unresolved conflicts";
    }
    else if (httpStatus >= 300 && httpStatus < 400) {
      text = `It appears that the remote head moved, therefore you are no longer pushing on top of the latest commit.
          You can either remove the merge state (and run push again, which will create new merge state) or close dialog.`;
    }
    return <>
      <ModalHeader>
        <ModalTitle>Finish merge state caused by pushing</ModalTitle>
        <ModalDescription>
          {text}
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <Button variant="outline" onClick={() => finalizerHandler()}>Remove merge state</Button>
        <Button variant="outline" onClick={() => resolve()}>Close dialog</Button>
      </ModalFooter>
    </>;
  }
  return null;
};
