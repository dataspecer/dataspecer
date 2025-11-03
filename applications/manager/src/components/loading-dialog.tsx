import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { Loader } from "lucide-react";
import { useEffect } from "react";


type LoadingDialogProps = {
  dialogTitle: string;
  waitingText: string;
  setCloseDialogAction: (newAction: () => void) => void;
} & BetterModalProps;

export const createCloseDialogObject = () => {
  const closeDialogObject = {
    closeDialogAction: () => {},
    setCloseDialogAction: (newAction: () => void) => { closeDialogObject.closeDialogAction = newAction },
  };
  return closeDialogObject;
}

export const LoadingDialog = ({ isOpen, resolve, waitingText, dialogTitle, setCloseDialogAction }: LoadingDialogProps) => {
  useEffect(() => {
    setCloseDialogAction(resolve);
  }, []);

  return (
    <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : resolve()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{dialogTitle}</ModalTitle>
          <ModalDescription>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            {waitingText}
          </ModalDescription>
        </ModalHeader>
          <ModalFooter className="flex flex-row">
            <Button variant="outline" onClick={() => resolve()}>Close dialog</Button>
          </ModalFooter>
      </ModalContent>
    </Modal>
  );
};