import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";


type LoadingDialogProps = {
  dialogTitle: string;
  waitingText: string;
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
 */
export const LoadingDialog = ({ isOpen, resolve, waitingText, dialogTitle, setCloseDialogAction, shouldShowTimer }: LoadingDialogProps) => {
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



  return (
    <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : resolve()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t(dialogTitle)}</ModalTitle>
          <ModalDescription>
            {t(waitingText)}
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