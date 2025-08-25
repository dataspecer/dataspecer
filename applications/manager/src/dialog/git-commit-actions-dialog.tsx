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
  branch: string | null,
  branchAlreadyExistsInDS: boolean,
  commitAlreadyExistsInDS: boolean,
} & BetterModalProps<null>;

export const CommitActionsDialog = ({ examinedPackage, branch, commitHash, branchAlreadyExistsInDS, commitAlreadyExistsInDS, isOpen, resolve }: CommitActionsDialogProps) => {
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);

  const handleRedirect = () => {
    setIsPerformingAction(true);
    const defaultGitURL = examinedPackage.linkedGitRepositoryURL;
    const gitURL = defaultGitURL + `/tree/${commitHash}`;     // TODO RadStr: Hardcoded - we somehoew have to share the Git providers code from backend here on frontend
    //                                                        // TODO RadStr: (... without the credentials code ... we just need small subset - just the factory and create URL)
    window.location.href = gitURL;
  };

  const handleImportGitCommitToDS = async () => {
    handleImport("commit");
  };

  const handleImportGitBranchToDS = async () => {
    if (branch === null) {
      handleImport("commit");
    }
    else {
      handleImport("branch");
    }
  };

  const handleImport = async (importType: "commit" | "branch") => {
    setIsPerformingAction(true);

    const commitPointer = importType === "commit" ? commitHash : branch;

    const defaultGitURL = examinedPackage.linkedGitRepositoryURL;
    const gitURL = defaultGitURL + `/tree/${commitPointer}`;     // TODO RadStr: Same as the redirect ... again need the git providers code from backend
    const rootURL = "http://dataspecer.com/packages/local-root";
    await fetch(import.meta.env.VITE_BACKEND +
      "/resources/import-from-git?parentIri=" + encodeURIComponent(rootURL) +
      "&gitURL=" + encodeURIComponent(gitURL) +
      `&commitReferenceType=${importType}`, {
      method: "POST",
    });
    requestLoadPackage(rootURL, true);

    setIsPerformingAction(false);
    resolve(null);
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="min-w-[650px]">
        <ModalHeader>
          <ModalTitle>Perform action on git commit</ModalTitle>
          {isPerformingAction && <Loader className="mr-2 h-4 w-4 animate-spin" /> }
          <ModalDescription>
            {`You are currently working with the following package (${examinedPackage.iri}) and following commit ${commitHash}.`}
            <br/>
            <br/>
            {`You can choose to import the package into DS or visit the corresponding remote git url.`}
            <br/>
            <br/>
            {branchAlreadyExistsInDS ?
              <div>
                Note that branch already exists inside DS, so we can not create new one. If you want one you have to first create new branch with new name
                <br/>
                <br/>
              </div> :
              null
            }
            {commitAlreadyExistsInDS ? "Note that commit already exists inside DS, however you can still import the commit." : null}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={handleImportGitCommitToDS} disabled={isPerformingAction}>Import static commit to DS</Button>
          {branch !== null && !branchAlreadyExistsInDS && <Button variant="outline" onClick={handleImportGitBranchToDS} disabled={isPerformingAction}>Import branch ({branch}) to DS</Button>}
          <Button variant="outline" onClick={handleRedirect} disabled={isPerformingAction}>Redirect to commit</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}