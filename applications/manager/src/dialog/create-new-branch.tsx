import { BetterModalProps, useBetterModal, } from "@/lib/better-modal";
import { useContext, useLayoutEffect, useRef, useState } from "react";
import { Package } from "@dataspecer/core-v2/project";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { modifyPackageProjectData, modifyPackageRepresentsBranchHead, packageService, refreshRootPackage, requestLoadPackage, ResourcesContext } from "@/package";
import { createIdentifierForHTMLElement, InputComponent } from "@/components/input-component";
import { toast } from "sonner";
import { createSetterWithGitValidation, PACKAGE_ROOT } from "@dataspecer/git";
import { resolveWithRequiredCheck } from "./git-actions-dialogs";
import { createCloseLoadingDialogObject, LoadingDialog } from "./loading-dialog";
import { CREATE_NEW_BRANCH_WAIT_TIME } from "@/utils/git-wait-times";
import { useTranslation } from "react-i18next";


export enum BranchAction {
  CreateNewBranch,
  TurnExistingIntoBranch,
}

type CreateBranchDialogProps = {
  sourcePackage: Package,
  actionOnConfirm: BranchAction,
} & BetterModalProps<{
  newBranch: string,
} | null>;

const idPrefix = "createNewbranch";

/**
 * React component representing dialog for creating of new branches. Respectively, it has two purposes.
 *  One is to create a new branch with given name from given sourcePackage. Second is turning commit into a branch.
 */
export const CreateNewBranchDialog = ({ sourcePackage, actionOnConfirm, isOpen, resolve }: CreateBranchDialogProps) => {
  const openModal = useBetterModal();
  const { t } = useTranslation();

  const [shouldHideDialog, setShouldHideDialog] = useState<boolean>(false);
  const [branch, setBranch] = useState<string>(sourcePackage.branch);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useLayoutEffect(() => {
    if (isOpen) {
      window.requestAnimationFrame(() => document.getElementById(createIdentifierForHTMLElement(idPrefix, 0, "input"))?.focus());
    }
  }, []);


  const existingResources = useContext(ResourcesContext);

  const handleDialogSave = async () => {
    const existingPackagesForProject = Object.values(existingResources).filter(existingResource => existingResource?.projectIri === sourcePackage.projectIri);
    const existingBranchesForProject = existingPackagesForProject.map(p => p?.branch);
    const branchAlreadyExists = existingBranchesForProject.includes(branch);

    if (!resolveWithRequiredCheck(() => {}, inputRef)) {
      // The branch is empty
      return;
    }

    if (branch === "") {
      // Should be covered by the resolve check.
      toast.error(t("create-new-branch-dialog.toast.branch-empty"), { "richColors": true });
      resolve(null);
      return;
    }
    else if (branchAlreadyExists) {
      toast.error(t("create-new-branch-dialog.toast.branch-already-exists"), { "richColors": true });
      resolve(null);
      return;
    }

    let response: any;
    if (actionOnConfirm === BranchAction.CreateNewBranch) {
      const closeDialogObject = createCloseLoadingDialogObject();
      setShouldHideDialog(true);
      openModal(LoadingDialog, {
        dialogTitle: t("create-new-branch-dialog.loading.dialogTitle"),
        waitingText: t("create-new-branch-dialog.loading.waitingText"),
        waitTime: CREATE_NEW_BRANCH_WAIT_TIME,
        setCloseDialogAction: closeDialogObject.setCloseDialogAction,
        shouldShowTimer: true,
        shouldDisableClosing: true,
      });
      try {
        response = await packageService.copyRecursively(sourcePackage.iri, PACKAGE_ROOT);
        const newRootIri: string | undefined = response?.newRootIri;
        if (newRootIri === undefined) {
          toast.error(t("create-new-branch-dialog.toast.failed-create-branch"), { "richColors": true });
          resolve(null);
          return;
        }
        await modifyPackageProjectData(newRootIri, sourcePackage.projectIri, branch);
        toast.success(t("create-new-branch-dialog.toast.success-create-branch"));
      }
      catch (error) {
        toast.error(t("create-new-branch-dialog.toast.unknown-failure-create-branch"), { "richColors": true });
        throw error;
      }
      finally {
        // Has to be in the finally block, since if error is thrown, then the loading dialog is not closed and we wait forever
        closeDialogObject.closeDialogAction();
      }
      await refreshRootPackage();
    }
    else if (actionOnConfirm === BranchAction.TurnExistingIntoBranch) {
      response = await modifyPackageRepresentsBranchHead(sourcePackage.iri, !sourcePackage.representsBranchHead);
      await modifyPackageProjectData(sourcePackage.iri, sourcePackage.projectIri, branch);
      await requestLoadPackage(sourcePackage.iri, true);
      resolve({ newBranch: branch, });
    }
    else {
      throw new Error(`Programmer error, wrong enum: ${actionOnConfirm}`)
    }

    resolve({ newBranch: branch });
  };
  const handleDialogCloseWithoutSave = () => {
    resolve(null);
  };

  const titleTooltip = actionOnConfirm === BranchAction.CreateNewBranch ? t("create-new-branch-dialog.tooltip.branch-name", { projectIri: sourcePackage.projectIri }) : "";

  const modalTitle = actionOnConfirm === BranchAction.CreateNewBranch ?
    t("create-new-branch-dialog.title.create-new-branch") :
    t("create-new-branch-dialog.title.turn-existing-into-branch");

  const modalDescriptionCreateNewBranch = t("create-new-branch-dialog.description.create-new-branch");
  const modalDescriptionCreateNewBranchWarning = t("create-new-branch-dialog.description.create-new-branch-warning");
  const modalDescriptionTurnExisting = t("create-new-branch-dialog.description.turn-existing-into-branch");

  return (
    <Modal open={!shouldHideDialog && isOpen} onClose={() => resolve(null)}>
        <ModalContent className={(shouldHideDialog ? "hidden" : "")}>
          <ModalHeader>
            <ModalTitle>{modalTitle}</ModalTitle>
            <ModalDescription>
              {actionOnConfirm === BranchAction.CreateNewBranch ? (
                <>
                  <p>{modalDescriptionCreateNewBranch}</p>
                  <br />
                  <p>{modalDescriptionCreateNewBranchWarning}</p>
                </>
              ) : (
                <p>{modalDescriptionTurnExisting}</p>
              )}
            </ModalDescription>
          </ModalHeader>

          <InputComponent requiredRefObject={inputRef} idPrefix={idPrefix} idSuffix={0} label={t("create-new-branch-dialog.label.branch-name")} input={branch} setInput={createSetterWithGitValidation(setBranch)} tooltip={titleTooltip}/>

          <ModalFooter>
            <Button variant="outline" onClick={handleDialogCloseWithoutSave}>{t("close")}</Button>
            <Button className="hover:bg-purple-700" onClick={handleDialogSave}>{t("confirm")}</Button>
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
}
