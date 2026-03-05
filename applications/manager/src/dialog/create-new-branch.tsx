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
import { createCloseDialogObject, LoadingDialog } from "./loading-dialog";
import { CREATE_NEW_BRANCH_WAIT_TIME } from "@/utils/git-wait-times";


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

export const CreateNewBranchDialog = ({ sourcePackage, actionOnConfirm, isOpen, resolve }: CreateBranchDialogProps) => {
  const openModal = useBetterModal();

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
      // TODO RadStr Later: Localization
      toast.error("Given branch name is empty", { "richColors": true });
      resolve(null);
      return;
    }
    else if (branchAlreadyExists) {
      // TODO RadStr Later: Localization
      toast.error("Branch already exists", { "richColors": true });
      resolve(null);
      return;
    }

    let response: any;
    if (actionOnConfirm === BranchAction.CreateNewBranch) {
      const closeDialogObject = createCloseDialogObject();
      setShouldHideDialog(true);
      openModal(LoadingDialog, {
        dialogTitle: "Creating new branch in Dataspecer. Do not forget to push it to the remote after you are done.",
        waitingText: null,
        waitTime: CREATE_NEW_BRANCH_WAIT_TIME,
        setCloseDialogAction: closeDialogObject.setCloseDialogAction,
        shouldShowTimer: true,
      });
      try {
        response = await packageService.copyRecursively(sourcePackage.iri, PACKAGE_ROOT);
        const newRootIri: string | undefined = response?.newRootIri;
        if (newRootIri === undefined) {
          toast.error("Failed to create the new branch", { "richColors": true });
          resolve(null);
          return;
        }
        await modifyPackageProjectData(newRootIri, sourcePackage.projectIri, branch);
        toast.success("Successfully created new branch in Dataspecer. Don't forget to push it.");
      }
      catch (error) {
        toast.error("Unknown failure when creating new branch", { "richColors": true });
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

  const titleTooltip = actionOnConfirm === BranchAction.CreateNewBranch ? `Setting the branch name for the following projectIri: ${sourcePackage.projectIri}` : "";

  const modalTitle = actionOnConfirm === BranchAction.CreateNewBranch ?
    "Create new branch in project" :
    "Set name for branch to be created from static commit";

  const modalDescription = actionOnConfirm === BranchAction.CreateNewBranch ?
    `On confirm creates new package, which is copy of the source package and has branch set to given name` :
    `On confirm sets branch of chosen package`;


  return (
    <Modal open={!shouldHideDialog && isOpen} onClose={() => resolve(null)}>
        <ModalContent className={(shouldHideDialog ? "hidden" : "")}>
          <ModalHeader>
            <ModalTitle>{modalTitle}</ModalTitle>
            <ModalDescription>{modalDescription}</ModalDescription>
          </ModalHeader>

          <InputComponent requiredRefObject={inputRef} idPrefix={idPrefix} idSuffix={0} label="Branch name" input={branch} setInput={createSetterWithGitValidation(setBranch)} tooltip={titleTooltip}/>

          <ModalFooter>
            <Button variant="outline" onClick={handleDialogCloseWithoutSave}>Close</Button>
            <Button className="hover:bg-purple-700" onClick={handleDialogSave}>Confirm</Button>
          </ModalFooter>
        </ModalContent>
    </Modal>
  );
}