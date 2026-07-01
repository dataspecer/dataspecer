import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { removeGitLinkFromPackage } from "@/utils/git-fetch-related-actions";
import { useTranslation } from "react-i18next";


type DeleteGitRepositoryProps = {
  iri: string;
  gitUrl: string;
} & BetterModalProps<null>;

export const DeleteGitRepoDialog = ({ iri, gitUrl, isOpen, resolve }: DeleteGitRepositoryProps) => {
  const { t } = useTranslation();

  const removeAndClose = () => {
    removeGitLinkFromPackage(t, iri);
    resolve(null);
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{t("delete-git-repo-dialog.title")}</ModalTitle>
            <ModalDescription>
              <p>{t("delete-git-repo-dialog.description.line.one.part-one")}<strong>{t("delete-git-repo-dialog.description.line.one.part-two")}</strong>{t("delete-git-repo-dialog.description.line.one.part-three")}</p>
              <br/>
              <p>{t("delete-git-repo-dialog.description.line.two")} <a className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600" href={gitUrl}>{gitUrl}</a></p>
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={() => resolve(null)}>{t("close")}</Button>
            <Button variant="destructive" onClick={() => removeAndClose()}>{t("delete-git-repo-dialog.button.delete")}</Button>
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
};
