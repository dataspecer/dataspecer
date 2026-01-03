import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { removeGitLinkFromPackage } from "@/utils/git-fetch-related-actions";


type DeleteGitRepositoryProps = {
  iri: string;
  gitUrl: string;
} & BetterModalProps<null>;

export const DeleteGitRepoDialog = ({ iri, gitUrl, isOpen, resolve }: DeleteGitRepositoryProps) => {
  const removeAndClose = () => {
    removeGitLinkFromPackage(iri);
    resolve(null);
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete Git repository</ModalTitle>
            <ModalDescription>
              <p>You are about to <strong>DELETE</strong> remote Git repository. Are you sure?</p>
              <br/>
              <p>The Git repository URL: <a className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600" href={gitUrl}>{gitUrl}</a></p>
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={() => resolve(null)}>Close</Button>
            <Button variant="destructive" onClick={() => removeAndClose()}>Delete</Button>
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
};