import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { useTranslation } from "react-i18next";


type InfoDialogProps = {
  title: string;
  description: string | null;
  content: string | null;
} & BetterModalProps;


/**
 * Simple info dialog with close button, that gets the {@link InfoDialogProps}
 */
export const InfoDialog = ({ isOpen, resolve, title, description, content }: InfoDialogProps) => {
  const { t } = useTranslation();

  return (
    <Modal open={isOpen} onClose={() => resolve()}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalDescription>
            <p className="whitespace-pre-line">{description}</p>
          </ModalDescription>
        </ModalHeader>
        {content}
        <ModalFooter className="flex flex-row">
          <Button variant="outline" onClick={() => resolve()}>{t("close")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};