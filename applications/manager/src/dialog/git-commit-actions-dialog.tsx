import { BetterModalProps, } from "@/lib/better-modal";
import { useState } from "react";
import { Package } from "@dataspecer/core-v2/project";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { refreshRootPackage } from "@/package";
import { PACKAGE_ROOT } from "@dataspecer/git";
import { lng } from "@/Dir";
import { GitProviderFactory } from "@dataspecer/git/git-providers";


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
    const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(defaultGitURL, fetch, {});
    const owner = gitProvider.extractPartOfRepositoryURL(defaultGitURL, "user-name");
    const repoName = gitProvider.extractPartOfRepositoryURL(defaultGitURL, "repository-name");
    if (owner === null) {
      throw new Error("Owner can not be extracted from the URL");
    }
    if (repoName === null) {
      throw new Error("Repository name can not be extracted from the URL");
    }
    const gitURL = gitProvider.createGitRepositoryURL(owner, repoName, {type: "commit", sha: commitHash});
    const newTab = window.open(gitURL, "_blank");
    newTab?.focus();
    setIsPerformingAction(false);
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
    await fetch(import.meta.env.VITE_BACKEND +
      "/resources/import-from-git?parentIri=" + encodeURIComponent(PACKAGE_ROOT) +
      "&gitURL=" + encodeURIComponent(gitURL) +
      `&commitReferenceType=${importType}`, {
      method: "POST",
    });
    await refreshRootPackage();

    setIsPerformingAction(false);
    resolve(null);
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="min-w-[650px]">
        <ModalHeader>
          <ModalTitle>Perform action on Git commit</ModalTitle>
          {isPerformingAction && <Loader className="mr-2 h-4 w-4 animate-spin" /> }
          <ModalDescription>
            {`You are currently working with the following package (${lng(examinedPackage.userMetadata.label) ?? examinedPackage.iri}) and following commit ${commitHash.substring(0, 10)}.`}
            <br/>
            <br/>
            {`You can choose to import the package into DS or visit the corresponding remote Git URL.`}
            <br/>
            <br/>
            {branchAlreadyExistsInDS ?
              <div>
                <p>Note that <strong>branch already exists</strong> inside Dataspecer and it is forbidden (for your own good) to have two packages tracking the same remote branch in Dataspecer.
                <br/>
                You can <strong>import static commit</strong> and then turn the commit into branch with <strong>new</strong> name. Or just click on create branch in the Git menu.</p>
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
          <Button variant="outline" onClick={handleRedirect} disabled={isPerformingAction}>View commit in Git remote</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}