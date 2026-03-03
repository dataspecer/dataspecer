import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { createTranslationForWaitTime, GitWaitTime } from "@/utils/git-wait-times";
import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";


type LoadingDialogProps = {
  dialogTitle: string;
  waitTime: GitWaitTime;
  waitingText: string | null;
  setCloseDialogAction: (newAction: () => void) => void;
  shouldShowTimer: boolean;
} & BetterModalProps;

export const createCloseDialogObject = () => {
  const closeDialogObject = {
    closeDialogAction: () => {},
    setCloseDialogAction: (newAction: () => void) => { closeDialogObject.closeDialogAction = newAction },
  };
  return closeDialogObject;
}

/**
 * The {@link dialogTitle} and {@link waitingText} should be the keys for translation. They will be translated in the React component.
 * The {@link setCloseDialogAction} is a setter, which is set when the dialog is mounted. The caller is then expected to call the function,
 *  which was passed to the set method. When the the passed in method is called it closes this loading dialog.
 * Therefore, and this is important, the caller is responsible for closing this dialog (unless the user closes the dialog explicitly).
 *  The idea is that the caller closes the loading dialog after the action we were waiting for is done.
 */
export const LoadingDialog = ({ isOpen, resolve, waitTime, waitingText, dialogTitle, setCloseDialogAction, shouldShowTimer }: LoadingDialogProps) => {
  const [secondsPassed, setSecondsPassed] = useState<number>(0);
  const { t } = useTranslation();

  useEffect(() => {
    setCloseDialogAction(resolve);
    let interval: NodeJS.Timeout | null = null;
    if (shouldShowTimer) {
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


  const translatedWaitingText = waitingText === null ? "" : t(waitingText);

  return (
    <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : resolve()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t(dialogTitle)}</ModalTitle>
          <ModalDescription>
            {translatedWaitingText}
            {waitingText === null ? null : <br/>}
            {createTranslationForWaitTime(t, waitTime)}
            <div className="flex">
              <Loader className="mr-2 mt-1 h-4 w-4 animate-spin" />
              { shouldShowTimer ? `${secondsPassed} ${t("git.loading-dialog-seconds-passed")}` : null }
            </div>
          </ModalDescription>
        </ModalHeader>
          <ModalFooter className="flex flex-row">
            <Button variant="outline" onClick={() => resolve()}>{t("close")}</Button>
          </ModalFooter>
      </ModalContent>
    </Modal>
  );
};