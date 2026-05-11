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


/**
 * The dialog that is shown the user clicks on commit "bubble" from the Git graph dialog.
 */
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
            <div className="flex flex-1 flex-row">{t("git-history-visualization-commit-actions.title")}</div>
          </ModalTitle>
          {isPerformingAction && <Loader className="mr-2 h-4 w-4 animate-spin" /> }
          <ModalDescription className="overflow-x-auto">
            <br/>
            <div>
              <strong>{t("git-history-visualization-commit-actions.description.iri")}:</strong> {examinedPackage.iri}
            </div>
            {lng(examinedPackage.userMetadata.label) === undefined ? null : <div><strong>{t("git-history-visualization-commit-actions.description.label")}:</strong> {lng(examinedPackage.userMetadata.label)}</div>}
            <div>
              <strong>{t("git-history-visualization-commit-actions.description.commit-hash")}:</strong> {commitHash.substring(0, 10)}
            </div>
            {branch === null ? null :
              <div>
                <strong>{t("git-history-visualization-commit-actions.description.branch")}:</strong> {branch}
              </div>
            }
            <br/>
            {branchAlreadyExistsInDS ?
              <div className="flex flex-1 flex-row">
                <p><strong>{t("git-history-visualization-commit-actions.description.branch-already-tracked")}</strong></p>
                  <PopOverGitGeneralComponent><GitHistoryDialogInfoTooltip/></PopOverGitGeneralComponent>
              </div> :
              null
            }
            {commitAlreadyExistsInDS ? t("git-history-visualization-commit-actions.description.commit-already-exists") : null}
            {t("git-history-visualization-commit-actions.description.closing")}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" className="border bg-blue-100 border-blue-500 hover:bg-blue-500 hover:text-white transition" onClick={handleImportGitCommitToDS} disabled={isPerformingAction}>{t("git-history-visualization-commit-actions.import-commit")}</Button>
          {branch !== null && !branchAlreadyExistsInDS && <Button className="border bg-green-100 border-green-500 hover:bg-green-500 hover:text-white transition" variant="outline" onClick={handleImportGitBranchToDS} disabled={isPerformingAction}>{t("git-history-visualization-commit-actions.import-branch")}</Button>}
          <Button variant="outline" onClick={handleRedirect} disabled={isPerformingAction}>{t("git-history-visualization-commit-actions.view-in", { provider: gitProvider.getProviderName() })}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}


const GitHistoryDialogInfoTooltip = () => {
  const { t } = useTranslation();
  return <div>
    <p>{t("git-history-visualization-commit-actions.tooltip.branch-exists.line.1.part.1")}<strong>{t("git-history-visualization-commit-actions.tooltip.branch-exists.line.1.part.2")}</strong>{t("git-history-visualization-commit-actions.tooltip.branch-exists.line.1.part.3")}
    <br/>
    {t("git-history-visualization-commit-actions.tooltip.branch-exists.line.2.part.1")}<strong>{t("git-history-visualization-commit-actions.tooltip.branch-exists.line.2.part.2")}</strong>{t("git-history-visualization-commit-actions.tooltip.branch-exists.line.2.part.3")}<strong>{t("git-history-visualization-commit-actions.tooltip.branch-exists.line.2.part.4")}</strong>{t("git-history-visualization-commit-actions.tooltip.branch-exists.line.2.part.5")}<strong>{t("git-history-visualization-commit-actions.tooltip.branch-exists.line.2.part.6")}</strong>{t("git-history-visualization-commit-actions.tooltip.branch-exists.line.2.part.7")}</p>
  </div>;
};
