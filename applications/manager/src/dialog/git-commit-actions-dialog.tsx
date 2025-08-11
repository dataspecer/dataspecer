import { BetterModalProps, } from "@/lib/better-modal";
import { useState } from "react";
import { Package } from "@dataspecer/core-v2/project";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { requestLoadPackage } from "@/package";

type CommitActionsDialogProps = {
  examinedPackage: Package,
  commitHash: string,
} & BetterModalProps<null>;

export const CommitActionsDialog = ({ examinedPackage, commitHash, isOpen, resolve }: CommitActionsDialogProps) => {
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);


  const handleRedirect = () => {
    setIsPerformingAction(true);
    const defaultGitURL = examinedPackage.linkedGitRepositoryURL;
    const gitURL = defaultGitURL + `/tree/${commitHash}`;     // TODO RadStr: Hardcoded - we somehoew have to share the Git providers code from backend here on frontend
    //                                                        // TODO RadStr: (... without the credentials code ... we just need small subset - just the factory and create URL)
    window.location.href = gitURL;
  };

  const handleImportGitCommitToDS = async () => {
    setIsPerformingAction(true);

    const defaultGitURL = examinedPackage.linkedGitRepositoryURL;
    const gitURL = defaultGitURL + `/tree/${commitHash}`;     // TODO RadStr: Same as the redirect ... again need the git providers code from backend
    const rootURL = "http://dataspecer.com/packages/local-root";
    await fetch(import.meta.env.VITE_BACKEND +
      "/resources/import-from-git?parentIri=" + encodeURIComponent(rootURL) +
      "&gitURL=" + encodeURIComponent(gitURL) +
      "&commitType=commit", {
      method: "POST",
    });
    requestLoadPackage(rootURL, true);

    setIsPerformingAction(false);
    resolve(null);
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
        <ModalContent>
        <ModalHeader>
          <ModalTitle>Perform action on git commit</ModalTitle>
          {isPerformingAction && <Loader className="mr-2 h-4 w-4 animate-spin" /> }
          <ModalDescription>
            {`You are currently working with the following package (${examinedPackage.iri}) and following commit ${commitHash}.`}
            <br/>
            <br/>
            {`You can choose to import the package into DS or visit the corresponding remote git url.`}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={handleImportGitCommitToDS} disabled={isPerformingAction}>Import commit to DS</Button>
          <Button variant="outline" onClick={handleRedirect} disabled={isPerformingAction}>Redirect to commit</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}