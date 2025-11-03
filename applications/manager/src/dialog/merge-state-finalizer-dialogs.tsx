import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps, OpenBetterModal } from "@/lib/better-modal";
import { finalizeMergeMergeStateOnFailure, finalizePullMergeState, finalizePullMergeStateOnFailure, finalizePushMergeState, finalizePushMergeStateOnFailure } from "@/utils/merge-state-backend-requests";
import { FinalizerVariantsForPullOnFailure, getEditableValue, MergeState } from "@dataspecer/git";
import { Loader } from "lucide-react";
import { Dispatch, SetStateAction, useContext, useState } from "react";
import { toast } from "sonner";
import { commitToGitDialogOnClickHandler } from "./git-url";
import { ResourcesContext } from "@/package";


type MergeStateFinalizerProps = {
  mergeState: MergeState;
  openModal: OpenBetterModal;
} & BetterModalProps;

type MergeStateFinalizerSpecificCauseProps = {
  shouldRenderAnswerDialog: boolean;
  setShouldRenderAnswerDialog: Dispatch<SetStateAction<boolean>>;
  setIsWaitingForAnswer: Dispatch<SetStateAction<boolean>>;
} & Omit<MergeStateFinalizerProps, "isOpen">;

type MergeStateFinalizerAnswerDialogProps = {
  httpStatus: number;
} & Omit<MergeStateFinalizerProps, "isOpen" | "openModal">;

export const MergeStateFinalizerDialog = ({ mergeState, openModal, isOpen, resolve }: MergeStateFinalizerProps) => {
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState<boolean>(false);
  const [shouldRenderAnswerDialog, setShouldRenderAnswerDialog] = useState<boolean>(false);

  let content: React.ReactElement;
  if (mergeState.mergeStateCause === "merge") {
    content = MergeStateFinalizerForMerge({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, setIsWaitingForAnswer, openModal, resolve });
  }
  else if (mergeState.mergeStateCause === "push") {
    content = MergeStateFinalizerForPush({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, setIsWaitingForAnswer, openModal, resolve });
  }
  else if (mergeState.mergeStateCause === "pull") {
    content = MergeStateFinalizerForPull({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, setIsWaitingForAnswer, openModal, resolve });
  }
  else {
    throw new Error("Unknown merge state cause, can't render finalizer dialog");
  }


  return (
    <Modal open={isOpen} onClose={() => resolve()}>
      <ModalContent>
        {
        isWaitingForAnswer ?
          <Loader className="mr-2 h-4 w-4 animate-spin" /> :
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

const MergeStateFinalizerForMerge = ({ mergeState, shouldRenderAnswerDialog, setShouldRenderAnswerDialog, setIsWaitingForAnswer, resolve }: MergeStateFinalizerSpecificCauseProps) => {
  const [httpStatusCode, setHttpStatusCode] = useState<number>(-1);

  const handleMergeAction = async () => {
    // setIsWaitingForAnswer(true);
    // const response = await finalizeMergeMergeState(mergeState.uuid);
    // if (response !== null) {
    //   if (response === 409) {
    //     toast.error("There are still unresolved conflicts");
    //     resolve();
    //   }
    //   else if (response < 300) {
    //     toast.success("Finalizer succcessfully finished");
    //     resolve();
    //   }
    //   else if (response < 400) {
    //     // TODO RadStr: Probably do nothing - we will just show the another dialog.
    //   }
    //   else {
    //     toast.error("There was error when finalizing, check console for more info");
    //   }
    // }
    // else {
    //   toast.error("There was error when finalizing, check console for more info");
    // }
    // setHttpStatusCode(response ?? -1);
    // setIsWaitingForAnswer(false);
    // setShouldRenderAnswerDialog(true);
  };

  const handleRebaseAction = async () => {
    setIsWaitingForAnswer(true);
    const response = await finalizePullMergeState(mergeState.uuid);
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
      <MergeStateFinalizerForMergeAnswerDialog mergeState={mergeState} resolve={resolve} httpStatus={httpStatusCode} /> :
      <>
        <ModalHeader>
          <ModalTitle>Finish merge state caused by merging</ModalTitle>
          <ModalDescription>
            You can choose to either create classic merge commit. Or rebase commit,
            that is you just create new commit and put the changes on top.
            Or you can of course close the dialog and handle it all later.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => handleMergeAction()}>Create merge commit</Button>
          <Button variant="outline" onClick={() => handleRebaseAction()}>Create rebase changes</Button>
        </ModalFooter>
      </>
  );
}

const MergeStateFinalizerForMergeAnswerDialog = ({ mergeState, httpStatus, resolve }: MergeStateFinalizerAnswerDialogProps) => {
  const finalizerHandler = async () => {
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
        <Button variant="outline" onClick={() => finalizerHandler()}>Remove merge state</Button>
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

    if (response !== null) {
      if (response === 409) {
        toast.error("There are still unresolved conflicts");
        resolve();
      }
      else if (response < 300) {
        toast.success("Finalizer succcessfully finished");
        resolve();
        commitToGitDialogOnClickHandler(openModal, iri, sourceDSPackage, mergeState.commitMessage);
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
            You can either push the current content of package to git remote or close dialog.
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
