import { BetterModalProps, } from "@/lib/better-modal";
import { useState } from "react";
import { Package } from "@dataspecer/core-v2/project";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { refreshRootPackage } from "@/package";
import { GitRef, PACKAGE_ROOT } from "@dataspecer/git";
import { lng } from "@/Dir";
import { GitProviderFactory } from "@dataspecer/git/git-providers";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";
import { gitOperationResultToast } from "@/utils/utilities";
import { useTranslation } from "react-i18next";
import { importFromGit } from "@/utils/git-backend-requests";


type GitHistoryCommitActionsDialogProps = {
  examinedPackage: Package;
  commitHash: string;
  branch: string | null;
  branchAlreadyExistsInDS: boolean;
  commitAlreadyExistsInDS: boolean;
  closeMainGitGraphDialog: () => void;
} & BetterModalProps<null>;

export const GitHistoryCommitActionsDialog = ({ examinedPackage, branch, commitHash, branchAlreadyExistsInDS, commitAlreadyExistsInDS, isOpen, resolve, closeMainGitGraphDialog }: GitHistoryCommitActionsDialogProps) => {
  const { t } = useTranslation();
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);
  const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(examinedPackage.linkedGitRepositoryURL, fetch, {});

  const handleRedirect = () => {
    setIsPerformingAction(true);
    const gitUrl = gitProvider.extendGitRepositoryURLByGitRefSuffix(examinedPackage.linkedGitRepositoryURL, {type: "commit", sha: commitHash});
    const newTab = window.open(gitUrl, "_blank");
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

    let gitRef: GitRef;
    if (importType === "branch") {
      if (branch === null) {
        throw new Error("The provided branch is null");
      }
      else {
        gitRef = {
          type: "branch",
          name: branch,
        };
      }
    }
    else if (importType === "commit") {
      gitRef = {
        type: "commit",
        sha: commitHash,
      };
    }
    else {
      throw new Error(`Unknown import type: ${importType}`);
    }
    const gitProvider = GitProviderFactory.createGitProviderFromRepositoryURL(examinedPackage.linkedGitRepositoryURL, fetch, {});
    const gitUrl = gitProvider.extendGitRepositoryURLByGitRefSuffix(examinedPackage.linkedGitRepositoryURL, gitRef);
    const response = await importFromGit(PACKAGE_ROOT, gitUrl, importType);
    await refreshRootPackage();

    setIsPerformingAction(false);
    resolve(null);
    gitOperationResultToast(t, response);
    closeMainGitGraphDialog();
  };

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="md:min-w-[650px]">
        <ModalHeader>
          <ModalTitle>
            <div className="flex flex-1 flex-row">Perform action on Git commit</div>
          </ModalTitle>
          {isPerformingAction && <Loader className="mr-2 h-4 w-4 animate-spin" /> }
          <ModalDescription className="overflow-x-auto">
            <br/>
            <div>
              <strong>IRI:</strong> {examinedPackage.iri}
            </div>
            {lng(examinedPackage.userMetadata.label) === undefined ? null : <div><strong>Label:</strong> {lng(examinedPackage.userMetadata.label)}</div>}
            <div>
              <strong>Commit Hash:</strong> {commitHash.substring(0, 10)}
            </div>
            {branch === null ? null :
              <div>
                <strong>Branch:</strong> {branch}
              </div>
            }
            <br/>
            {branchAlreadyExistsInDS ?
              <div className="flex flex-1 flex-row">
                <p><strong>The Branch is already tracked in Dataspecer</strong></p>
                  <PopOverGitGeneralComponent><GitHistoryDialogInfoTooltip/></PopOverGitGeneralComponent>
              </div> :
              null
            }
            {commitAlreadyExistsInDS ? "The commit already exists inside DS. However, you can import it again." : null}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="default" className="hover:bg-purple-700" onClick={handleImportGitCommitToDS} disabled={isPerformingAction}>Import commit as new Dataspec</Button>
          {branch !== null && !branchAlreadyExistsInDS && <Button className="bg-green-500 hover:bg-green-700" variant="outline" onClick={handleImportGitBranchToDS} disabled={isPerformingAction}>Import branch as new Dataspec</Button>}
          <Button variant="outline" onClick={handleRedirect} disabled={isPerformingAction}>View in {gitProvider.getProviderName()}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}


function GitHistoryDialogInfoTooltip() {
  return <div>
    <p>If the <strong>branch already exists</strong> inside Dataspecer, it is forbidden (for your own good) to have two packages tracking the same remote branch in Dataspecer.
    <br/>
    You can <strong>import static commit</strong> and then turn the commit into branch with <strong>new</strong> name. Or just click on <strong>Create branch</strong> in the Git menu.</p>
  </div>;
}
