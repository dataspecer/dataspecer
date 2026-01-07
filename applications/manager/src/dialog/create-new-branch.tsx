import { BetterModalProps, } from "@/lib/better-modal";
import { useContext, useLayoutEffect, useRef, useState } from "react";
import { Package } from "@dataspecer/core-v2/project";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { modifyPackageProjectData, modifyPackageRepresentsBranchHead, packageService, refreshRootPackage, requestLoadPackage, ResourcesContext } from "@/package";
import { createIdentifierForHTMLElement, InputComponent } from "@/components/simple-input-component";
import { toast } from "sonner";
import { createSetterWithGitValidation, PACKAGE_ROOT } from "@dataspecer/git";
import { resolveWithRequiredCheck } from "./git-url";

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
      toast.error("Given branch name is empty");
      resolve(null);
      return;
    }
    else if (branchAlreadyExists) {
      // TODO RadStr Later: Localization
      toast.error("Branch already exists");
      resolve(null);
      return;
    }

    let response: any;
    if (actionOnConfirm === BranchAction.CreateNewBranch) {
      response = await packageService.copyRecursively(sourcePackage.iri, PACKAGE_ROOT);
      console.info("Created resource response:", { response });
      const newRootIri: string | undefined = response?.newRootIri;
      if (newRootIri === undefined) {
        return;
      }
      await modifyPackageProjectData(newRootIri, sourcePackage.projectIri, branch);
      await refreshRootPackage();
    }
    else {
      response = await modifyPackageRepresentsBranchHead(sourcePackage.iri, !sourcePackage.representsBranchHead);
      await modifyPackageProjectData(sourcePackage.iri, sourcePackage.projectIri, branch);
      await requestLoadPackage(sourcePackage.iri, true);
    }

    resolve({ newBranch: branch, });
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
    <Modal open={isOpen} onClose={() => resolve(null)}>
        <ModalContent>
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